---
name: sync-jira-task
description: Sync a local technical task markdown file to Jira — creates the task if it has no jira_key, updates it if jira_key is already set. Standalone task — NOT linked to a Jira epic. Adds the task to the project backlog (Scrum boards only). Idempotent create via "synced-from-*" label search. Embeds Bitbucket links rendered via ADF (default-branch refs). Maintains a Change Log in both the local task and Jira. Concurrent-edit guard via stored Jira `updated` timestamp. Drives Jira status from frontmatter `status` via Jira transitions. Use when the user says "create this task in Jira", "update this task in Jira", "sync task to Jira", "push task changes to Jira", or "publish task to Jira".
---

# sync-jira-task

## Purpose

One-way sync of a local technical task markdown file to Jira. Auto-detects create vs update from `jira_key` in frontmatter.

| `jira_key` present? | Action |
|---|---|
| Absent | **Pre-flight search by sync label**, then **Create** if no match. Writes `jira_key` back to file. |
| Present | **Update** existing Jira task via atomic PUT, append to Change Log. |

**Difference from `sync-jira-story`:** tasks are **standalone** — not associated with any Jira epic. No `jira_epic` field, no parent/Epic Link wiring, no epic Bitbucket URL. Issue type sent as `Task`.

## Key features

- **Idempotent create** — pre-flight JQL search by `synced-from-<task-dir>` label prevents duplicates if a previous POST left no `jira_key` in the file.
- **Atomic PUT** — uses `?returnIssue=true` so the fresh `updated` timestamp comes back in one round-trip.
- **Concurrent-edit guard** — stores Jira `fields.updated` in frontmatter as `jira_last_synced_at`. Aborts on next sync if Jira advanced (use `--force` to override).
- **Field-level diff** — Change Log entries say `Updated: summary, description, metadata` etc. Body and metadata hashes are stored separately (`jira_last_body_hash`, `jira_last_meta_hash`) so frontmatter changes (status/effort/category) don't masquerade as description changes.
- **Status transitions** — frontmatter `status` is mapped (emoji-stripped, lowercased) to Jira's transition list and POSTed to `/transitions` after sync.
- **Live priority resolution** — fetches `/rest/api/3/priority` and matches user input against the actual Jira instance, falling back to a built-in synonym map (`critical`→`Highest`, etc.).
- **Issue type cache** — Jira `Task` type id is cached to `<repo>/.cache/jira-issuetypes-<PROJECT>.json` for 24h.
- **Bullet/ordered lists** — body sections containing `- item` or `1. item` lines render as proper ADF lists, not paragraphs with hard-breaks.
- **Default-branch Bitbucket URLs** — links use the resolved `origin/HEAD` branch (e.g. `main`) instead of `HEAD`, so they survive file moves on detached commits.
- **HTTP retry** — automatic retry with exponential backoff on 5xx and network errors. 4xx responses fail fast.
- **Backlog placement (Scrum only)** — board type is detected via `/rest/agile/1.0/board/{id}/configuration`. Skipped on Kanban with a warning.
- **In-place frontmatter updates** — `jira_*` keys are updated where they sit, not stripped and re-appended. Clean diffs.
- **Empty / whitespace-only labels filtered** before send.
- **Hand-written `## Change Log` heading preserved** if found.
- **`--json` / `--quiet`** for CI / pipeline use.
- **Pluggable fetch** — `module.exports.run({ fetchImpl })` accepts an injected fetch for tests.

## When to Use

- "Create this task in Jira"
- "Sync / push / update this task to Jira"
- "I've edited the task, push changes to Jira"
- "Publish this task file to Jira"

## When NOT to Use

- Task is part of an epic / story workflow → use `/sync-jira-story` instead.
- Doc is a PRD, epic, or user-facing story → use `/sync-jira-epic` or `/sync-jira-story`.

## Prerequisites

### Required Files

- A task markdown file at `docs/development/tasks/task.<N>.<slug>/task.<N>.<slug>.md`.
- The task does **NOT** require any epic frontmatter. If `jira_epic` is set, it is ignored.

### Required Environment Variables

The script auto-loads `<repo-root>/.env`. Shell exports take precedence.

| Variable | Description |
|---|---|
| `JIRA_URL` | Jira base URL (e.g. `https://yourorg.atlassian.net`) |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_USER_EMAIL` | Jira account email |
| `JIRA_PROJECT_KEY` | Project key (e.g. `RB`) |
| `JIRA_BOARD_ID` | Board ID for backlog placement (Scrum boards only — skipped on Kanban) |

### Optional Environment Variables

| Variable | Description |
|---|---|
| `BITBUCKET_REPO_URL` | Override Bitbucket base URL (auto-detected from git remote) |

### Finding Your Board ID

```bash
curl -s -u "$JIRA_USER_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/agile/1.0/board?projectKeyOrId=$JIRA_PROJECT_KEY" \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); \
    JSON.parse(d).values.forEach(b=>console.log(b.id, b.name, b.type))"
```

Save it: `echo 'JIRA_BOARD_ID=<id>' >> "$(git rev-parse --show-toplevel)/.env"`

### Frontmatter constraints (non-full-YAML parser)

The script ships its own minimal YAML parser. Supported:

- Top-level `key: value` scalar pairs.
- Inline arrays `[a, b, "c d"]`.
- Block arrays (indented `- item` lines under a bare key).
- Outer matched single or double quotes on string values.

Not supported: nested mappings, anchors, aliases, escape sequences, multi-doc, flow mappings, comments inside the frontmatter block. Document body may contain `---` horizontal rules (close-tag is detected by scanning for `\n---` after the opener).

### Task frontmatter fields

```yaml
title: 'Task 1: Cache-lib Architecture Simplification'
priority: 'High'                    # mapped to live Jira priorities
category: 'refactoring'
estimated_effort_hours: 24
status: '🚧 In Progress'             # emoji stripped, mapped to Jira transition
labels: ['cache', 'refactor']       # synced-from-* label appended automatically
assignee: '5b10a2844c20165700ede21g' # Jira accountId (optional)
components: ['Cache']                # optional
fix_versions: ['1.0.0']              # optional
due_date: '2026-05-15'               # ISO date (optional)
```

## Workflow

### 1. Identify the Task File

```
docs/development/tasks/task.<N>.<slug>/task.<N>.<slug>.md
```

To find tasks that have **not yet been synced** (no `jira_key`):

```bash
grep -L 'jira_key:' $(find docs/development/tasks -name 'task.*.md' -not -name '*.plan.*' -not -name '*.qa.*' -not -name '*.bug.*')
```

### 2. Check Environment Variables

```bash
grep -E 'JIRA_URL|JIRA_PROJECT_KEY|JIRA_USER_EMAIL|JIRA_API_TOKEN|JIRA_BOARD_ID' \
  "$(git rev-parse --show-toplevel)/.env" 2>/dev/null
```

### 3. Optional — Dry Run

```bash
node .agents/skills/sync-jira-task/scripts/sync-jira-task.js \
  --file <task-file-path> \
  --dry-run
```

In dry-run, missing env vars are reported as warnings (not fatal), so you can preview the call shape.

### 4. Sync the Task

```bash
node .agents/skills/sync-jira-task/scripts/sync-jira-task.js \
  --file <task-file-path>
```

Flow:

1. Parse the task file (frontmatter + body) — safe against `---` horizontal rules in the body.
2. Resolve auth, Bitbucket repo URL + default branch, and load live Jira priorities.
3. If `jira_key` absent: search for an issue carrying the file's `synced-from-*` label. If found, switch to update.
4. Detect create vs update; on update fetch current state and run concurrent-edit guard.
5. Diff `summary`, body hash, meta hash, priority, labels.
6. Build a Jira ADF description: Change Log table → Source link → 11 task-doc sections → Metadata.
7. Resolve cached `Task` issue type id (or fetch + cache).
8. **Create** (POST) or **Update** (atomic PUT with `returnIssue=true`).
9. On create: detect board type. If Scrum, move to backlog via Agile API. If Kanban, skip with a warning.
10. If frontmatter `status` differs from current Jira status, fetch transitions and POST a status transition.
11. Update local file: in-place frontmatter for `jira_key`, `jira_url`, `task_bitbucket_url`, `jira_last_synced_at`, `jira_last_body_hash`, `jira_last_meta_hash`. Inline `**Jira Task**` / `**Task File**` links. Append Change Log entry.

### 5. Report to User

- ✅ Jira task key (e.g. `RB-47`)
- ✅ Jira URL
- ✅ Standalone (no parent epic)
- ✅ Added to backlog (or Kanban warning)
- ✅ Status transition (if applicable)
- ✅ Change log entry appended
- ✅ Task frontmatter updated (incl. `jira_last_synced_at` + body/meta hashes)

## Concurrent-Edit Guard

| Situation | Behaviour |
|---|---|
| Jira `updated` ≤ stored | Sync proceeds normally |
| Jira `updated` > stored | **Aborts**; pass `--force` to override |
| `--force` | Warning, sync proceeds, overwrites Jira |
| First sync (no stored timestamp) | Guard skipped |

## Status Transitions

Frontmatter `status` is normalised by stripping emoji, lower-casing, and mapping through:

| Frontmatter status | Jira target |
|---|---|
| `Planned`, `To Do`, `Open`, `Todo` | `To Do` |
| `In Progress`, `Doing`, `In-Progress` | `In Progress` |
| `Done`, `Completed`, `Complete` | `Done` |
| `Blocked` | `Blocked` |
| `Cancelled`, `Canceled` | `Cancelled` |

The script then fetches `/rest/api/3/issue/{key}/transitions` and matches by `to.name` (or `name` as a fallback). If no matching transition is available, a warning is emitted and sync still succeeds.

## Idempotent Create

When creating, the script first runs:

```
GET /rest/api/3/search?jql=project="RB" AND labels="synced-from-task.1.cache-lib"&maxResults=2
```

If a matching issue exists (because a prior POST succeeded but the local file did not get its `jira_key` written), the script switches to update mode against that key. Every create automatically appends the `synced-from-<dir>` label to enable this lookup on subsequent runs.

## Change Log Format

```markdown
<!-- jira-sync-changelog-start -->
## Change Log

| Date (UTC)       | Change                                |
|------------------|---------------------------------------|
| 2026-04-28 09:40 | Initial Jira task created             |
| 2026-04-28 11:05 | Updated: summary, description, status |
<!-- jira-sync-changelog-end -->
```

Entry rows are matched by a strict regex `^\|\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*\|`, so unrelated body markdown tables can't pollute the changelog.

## Task File Format

Before sync (minimal):

```yaml
---
title: 'Task 1: Cache-lib Architecture Simplification'
priority: 'High'
category: 'refactoring'
estimated_effort_hours: 24
status: '📋 Planned'
---
```

After sync the script writes (in-place, preserving order):

```yaml
jira_key: "RB-47"
jira_url: "https://yourorg.atlassian.net/browse/RB-47"
task_bitbucket_url: "https://bitbucket.org/org/repo/src/main/docs/development/tasks/task.1.../task.1....md"
jira_last_synced_at: "2026-04-28T11:05:33.123+0000"
jira_last_body_hash: "f4b2c1d9a0e72b58"
jira_last_meta_hash: "a91c0aef33eb1d04"
```

Note: no `jira_epic` is written (tasks are standalone). Any `jira_epic` already in the file is left untouched but ignored.

## Description sections rendered

The script extracts and renders these 11 task-doc headings into the Jira description:

1. Overview
2. Motivation
3. Technical Background
4. Scope
5. Breaking Changes
6. Implementation Plan
7. Files Summary
8. Testing Strategy
9. Success Criteria
10. Risk Assessment
11. Rollback Plan

Each section's body is converted to ADF, with `- item` and `1. item` lines becoming proper bulletList / orderedList nodes.

## Script Options

| Flag | Short | Description |
|---|---|---|
| `--file` | `-f` | Path to task markdown file (required) |
| `--summary` | `-s` | Override task summary/title |
| `--priority` | `-p` | Override priority |
| `--labels` | `-l` | Comma-separated labels |
| `--dry-run` | | Preview only — no Jira calls, no file writes |
| `--force` | | Override the concurrent-edit guard |
| `--json` | | Suppress human output; emit a single JSON object on completion |
| `--quiet` | | Suppress info logs (warnings still printed) |

### `--json` output shape

```json
{
  "action": "update",
  "dryRun": false,
  "file": "/abs/path/task.md",
  "jira_key": "RB-47",
  "jira_url": "https://yourorg.atlassian.net/browse/RB-47",
  "task_bitbucket_url": "https://bitbucket.org/.../task.md",
  "change_summary": "Updated: summary, description, metadata",
  "jira_last_synced_at": "2026-04-28T11:05:33.123+0000",
  "jira_last_body_hash": "f4b2c1d9a0e72b58",
  "jira_last_meta_hash": "a91c0aef33eb1d04"
}
```

On error: `{ "error": "<message>" }` and a non-zero exit code.

## Error Handling

| Error | Resolution |
|---|---|
| Missing env vars (live) | Add to `.env` and retry |
| Missing env vars (dry-run) | Warning only — preview proceeds |
| Bitbucket URL not detected | Set `BITBUCKET_REPO_URL`; link omitted but sync continues |
| File not found | Verify task file path |
| `401 Unauthorized` | Verify `JIRA_USER_EMAIL` and `JIRA_API_TOKEN` |
| `403 Forbidden` | Token lacks permission for issue/project |
| `404 Not Found` | Issue key in `jira_key` does not exist (or no view permission) |
| Concurrent-edit guard tripped | Pull manual Jira edits into the markdown, or pass `--force` |
| Task issue type not found | Throws — verify `Task` is enabled for project |
| Backlog move failed (Kanban) | Warning only — task still created |
| 5xx / network error | Retried twice with backoff before failing |
| Status transition unavailable | Warning only — sync still succeeds |

## Architecture

The script is a thin wrapper over `shared/resources/jira-sync.js`, which holds the shared primitives (frontmatter, ADF, changelog, http+retry, auth, diff, guard, board/transition/priority APIs). `sync-jira-epic` and `sync-jira-story` can adopt this lib in a follow-up.

## Tests

```bash
node --test .agents/skills/sync-jira-task/tests/*.test.js
```

55 tests covering frontmatter parsing, in-place frontmatter update, changelog upsert / strict entry-row regex / hand-written-heading rescue, body-vs-meta hash split, priority synonyms + live resolution, label sanitisation, concurrent-edit guard, ADF builders + bullet/ordered list detection, Jira error parser, HTTP retry on 5xx, status transitions, board-type detection, atomic PUT response parsing, fail-loud timestamp fetch, idempotent create via label search, and issue-type cache.

## Notes

- Jira is a **read-only mirror** — edit the markdown and re-sync; never edit Jira directly.
- Uses Jira REST API **v3** with **ADF** for issue operations and Jira Agile REST API v1 for board / backlog operations.
- API tokens: https://id.atlassian.com/manage-profile/security/api-tokens

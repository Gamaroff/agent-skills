---
name: sync-jira-story
description: Sync a local story markdown file to Jira — creates the story if it has no jira_key, updates it if jira_key is already set. Links the Jira story to its parent Jira epic (team-managed `parent` or classic Epic Link customfield, auto-detected with retry). Adds the story to the project backlog (Scrum boards only). Embeds Bitbucket links rendered via ADF (current-branch refs, fall back to default branch). Maintains a Change Log in both the local story and Jira. Concurrent-edit guard via stored Jira `updated` timestamp. Drives Jira status from frontmatter `status` via Jira transitions. Use when the user says "create this story in Jira", "update this story in Jira", "sync story to Jira", "push story changes to Jira", or "publish story to Jira".
---

# sync-jira-story

## Purpose

One-way sync of a local story markdown file to Jira. Auto-detects create vs update from `jira_key` in frontmatter.

| `jira_key` present? | Action |
|---|---|
| Absent | **Pre-flight search by sync label**, then **Create** as child of `jira_epic` if no match. Writes `jira_key` back to file. |
| Present | **Update** existing Jira story via atomic PUT, append to Change Log. |

**Difference from `sync-jira-task`:** stories are **linked to a parent Jira epic** (required `jira_epic` frontmatter). Issue type sent as `Story`. Project style is auto-detected (team-managed `parent` field vs classic Epic Link customfield), with retry on the opposite linkage if Jira rejects the first attempt.

## Key features

- **Idempotent create** — pre-flight JQL search by `synced-from-<story-dir>` label prevents duplicates if a previous POST left no `jira_key` in the file.
- **Atomic PUT** — uses `?returnIssue=true` so the fresh `updated` timestamp comes back in one round-trip.
- **Parent linkage detection + retry** — detects team-managed (`parent`) vs classic (`customfield_10014` Epic Link) project style on create. If the first attempt is rejected with a 400 mentioning `parent`/`epic_link`/`customfield_10014`, retries with the opposite field.
- **Concurrent-edit guard** — stores Jira `fields.updated` in frontmatter as `jira_last_synced_at`. Aborts on next sync if Jira advanced (use `--force` to override).
- **Field-level diff** — Change Log entries say `Updated: summary, description, metadata` etc. Body and metadata hashes are stored separately (`jira_last_body_hash`, `jira_last_meta_hash`) so frontmatter changes (status/effort/story_type) don't masquerade as description changes.
- **Status transitions** — frontmatter `status` is mapped (emoji-stripped, lowercased) to Jira's transition list and POSTed to `/transitions` after sync.
- **Live priority resolution** — fetches `/rest/api/3/priority` and matches user input against the actual Jira instance, falling back to a built-in synonym map (`critical`→`Highest`, etc.).
- **Issue type cache** — Jira `Story` type id is cached to `<repo>/.cache/jira-issuetypes-<PROJECT>.json` for 24h.
- **Bullet/ordered lists** — body sections containing `- item` or `1. item` lines render as proper ADF lists, not paragraphs with hard-breaks.
- **Current-branch Bitbucket URLs** — links use the current branch's remote-tracking branch (e.g. `origin/feature/...`), falling back to the default branch (`origin/HEAD`, e.g. `main`) when there is no upstream or HEAD is detached. Since feature branches are deleted post-merge, `review-story` pins the link to the durable branch (`develop`, when the story file already exists there) whenever it re-syncs, and `finalise` re-points it at acceptance (both via `--doc-branch`); you can also re-sync manually from `develop`/`main` after merge.
- **HTTP retry** — automatic retry with exponential backoff on 5xx, network errors, and 429 (Retry-After honoured, capped at 60s). Other 4xx responses fail fast.
- **Skip-when-no-diff** — on update, if the field diff is empty (`summary`, `description`, `metadata`, `priority`, `labels` all unchanged), the script skips the PUT, the file write-back, and the changelog entry. Status transitions still run.
- **Conditional `description` on PUT** — `description` is sent only when body or metadata content actually changed, so labels-only edits don't show up as edits in Jira's history.
- **Backlog placement (Scrum only)** — board type is detected via `/rest/agile/1.0/board/{id}/configuration`. Skipped on Kanban with a warning.
- **In-place frontmatter updates** — `jira_*` keys are updated where they sit, not stripped and re-appended. Clean diffs.
- **Empty / whitespace-only labels filtered** before send.
- **Hand-written `## Change Log` heading preserved** if found.
- **`--json` / `--quiet`** for CI / pipeline use.
- **Pluggable fetch** — `module.exports.run({ fetchImpl })` accepts an injected fetch for tests.

## When to Use

- "Create this story in Jira"
- "Sync / push / update this story to Jira"
- "I've edited the story, push changes to Jira"
- "Publish this story file to Jira"

## Prerequisites

### Resolve paths

Source `references/resolve-paths.sh` to populate `${PRD_ROOT}` (default `docs/prd`). Path references below substitute this env var.

### Required Files

- A story markdown file at:
  `${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<name>/stories/story.<N>.<M>.<slug>/story.<N>.<M>.<slug>.md`
- The story **MUST** have `jira_epic` in its frontmatter (e.g. `jira_epic: "PROJ-14"`).
  Run `/sync-jira-epic` on the parent epic first if missing. The script **exits with an error** if absent.
- Optionally: `epic_source` pointing to the parent epic file for Bitbucket link generation.

### Required Environment Variables

The script auto-loads `<repo-root>/.env`. Shell exports take precedence.

| Variable | Description |
|---|---|
| `JIRA_URL` | Jira base URL (e.g. `https://yourorg.atlassian.net`) |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_USER_EMAIL` | Jira account email |
| `JIRA_PROJECT_KEY` | Project key (e.g. `RB`) |
| `JIRA_BOARD_ID` | Board ID for backlog placement (Scrum boards only — skipped on Kanban). If unset, the script warns and continues; the story is still created. |

### Optional Environment Variables

| Variable | Description |
|---|---|
| `BITBUCKET_REPO_URL` | Override Bitbucket base URL (auto-detected from git remote) |
| `JIRA_EPIC_LINK_FIELD` | Custom field id for the classic "Epic Link" field. Defaults to `customfield_10014`. Only used on classic projects. |
| `JIRA_DEV_ESTIMATE_FIELD` | Custom field id to mirror `estimated_effort_hours` into (e.g. `customfield_10594`). Takes precedence over `jira.devEstimateField` in `skills-config.yaml`. Unset → not written. |

### Frontmatter constraints (non-full-YAML parser)

The script ships its own minimal YAML parser. Supported:

- Top-level `key: value` scalar pairs.
- Inline arrays `[a, b, "c d"]`.
- Block arrays (indented `- item` lines under a bare key).
- Outer matched single or double quotes on string values.

Not supported: nested mappings, anchors, aliases, escape sequences, multi-doc, flow mappings, comments inside the frontmatter block. Document body may contain `---` horizontal rules (close-tag is detected by scanning for `\n---` after the opener).

### Story frontmatter fields

```yaml
title: 'Story 1.2: Wire up new auth middleware'
epic_source: '${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<name>/epic.<N>.<name>.md'
jira_epic: "PROJ-14"                 # REQUIRED
story_type: 'feature_enhancement'
priority: 'high'
estimated_effort_hours: 4          # → timetracking.originalEstimate (+ jira.devEstimateField if configured)
status: '📋 Planned'                # emoji stripped, mapped to Jira transition
labels: ['auth']                   # synced-from-* label appended automatically
assignee: '5b10a2844c20165700ede21g'
components: ['Auth']
fix_versions: ['1.0.0']
due_date: '2026-05-15'
```

## Workflow

### 1. Identify the Story File

```
${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<slug>/stories/story.<N>.<M>.<slug>/story.<N>.<M>.<slug>.md
```

To find stories that have **not yet been synced** (no `jira_key`):

```bash
grep -L 'jira_key:' $(find "$PRD_ROOT" -path '*/stories/*/story.*.md')
```

### 2. Ensure `jira_epic` Is Set

```yaml
jira_epic: "PROJ-14"
```

Run `/sync-jira-epic` on the parent epic if not already done.

### 3. Optional — Dry Run

```bash
node .agents/skills/sync-jira-story/scripts/sync-jira-story.js \
  --file <story-file-path> \
  --dry-run
```

In dry-run, missing env vars are reported as warnings (not fatal), so you can preview the call shape.

### 4. Sync the Story

```bash
node .agents/skills/sync-jira-story/scripts/sync-jira-story.js \
  --file <story-file-path>
```

Flow:

1. Parse the story file (frontmatter + body) — safe against `---` horizontal rules in the body.
2. Verify `jira_epic` is present — exit with error if not.
3. Resolve auth, Bitbucket repo URL + branch (current branch's upstream, falling back to the default branch), and load live Jira priorities.
4. Resolve `epic_source` to a Bitbucket URL for the parent epic file.
5. If `jira_key` absent: search for an issue carrying the file's `synced-from-*` label. If found, switch to update.
6. Detect create vs update; on update fetch current state and run concurrent-edit guard.
7. Diff `summary`, body hash, meta hash, priority, labels.
8. **If diff empty (update path only):** skip the PUT, the file write-back, and the changelog entry. Status transition still runs. Exit clean.
9. Build a Jira ADF description: Change Log table → Source links → User Story / Acceptance Criteria / Description → Metadata.
10. Resolve cached `Story` issue type id (or fetch + cache); detect project style (cached 24 h).
11. **Create** (POST, with parent/Epic Link auto-retry on 400) or **Update** (atomic PUT with `returnIssue=true`). On update, `description` is sent only when body or metadata hash changed.
12. On create: detect board type. If Scrum, move to backlog via Agile API. If Kanban, skip with a warning. Fetch fresh `updated` + `status` in a single GET.
13. If frontmatter `status` differs from current Jira status, fetch transitions and POST a status transition.
14. Update local file (skipped under `--no-write` or when diff was empty): in-place frontmatter for `jira_key`, `jira_url`, `jira_epic`, `epic_bitbucket_url`, `story_bitbucket_url`, `jira_last_synced_at`, `jira_last_body_hash`, `jira_last_meta_hash`. Inline `**Jira Story**` / `**Jira Epic**` / `**Story File**` / `**Epic File**` links (code-block samples are skipped). Append Change Log entry.

### 5. Report to User

- ✅ Jira story key (e.g. `PROJ-47`)
- ✅ Jira URL
- ✅ Parent epic linked (e.g. `PROJ-14`) — `parent` or Epic Link customfield
- ✅ Added to backlog (or Kanban warning)
- ✅ Status transition (if applicable)
- ✅ Change log entry appended
- ✅ Story frontmatter updated (incl. `jira_last_synced_at` + body/meta hashes)

## Concurrent-Edit Guard

| Situation | Behaviour |
|---|---|
| Jira `updated` ≤ stored | Sync proceeds normally |
| Jira `updated` > stored | **Aborts**; pass `--force` to override |
| `--force` | Warning, sync proceeds, overwrites Jira |
| First sync (no stored timestamp) | Guard skipped |

## Status Transitions

Frontmatter `status` is normalised by stripping emoji and lower-casing, then resolved against an
**ordered list of candidate Jira status names** (overlaid with any `jira.statusMap` overrides from
`skills-config.yaml`). Candidates exist because Jira workflows name the same stage differently:

| Local status | Candidates, tried in order |
|---|---|
| `draft`, `planned`, `ready-for-development` | `To Do`, `Backlog`, `Open`, `New`, `Selected for Development` |
| `in-progress` | `In Progress`, `Doing`, `Started`, `Development` |
| `ready-for-review` | `In Review`, `Code Review`, `Ready for Review`, `Waiting for Review`, `Peer Review`, `Review` |
| `accepted` | `Done`, `Closed`, `Resolved`, `Complete`, `Completed` |
| `cancelled` | `Cancelled`, `Canceled`, `Won't Do`, `Rejected`, `Closed` |

The script fetches `/rest/api/3/issue/{key}/transitions?expand=transitions.fields` and picks a
transition by: already-in-a-candidate → no-op; then `to.name` across all candidates; then transition
`name`; then, for `accepted`/`cancelled` only, the single transition into the `done` status category.
It never infers a non-terminal transition from status category. If a transition's screen **requires**
fields, `resolution` is filled from that transition's own `allowedValues`; any other required field is
reported and the transition skipped rather than sent.

Nothing here fails the sync: a skipped status change warns, prints a summary line, and the rest of the
issue still syncs. Pass `--fail-on-status-skip` to exit non-zero instead.

**Inspect your board first.** `--probe-workflow` prints the project's statuses per issue type, the live
transitions, and exactly what each local status would do. Read-only. Most projects need no `statusMap`:

```bash
node scripts/sync-jira-story.js --probe-workflow
```

**Custom workflow vocabulary.** Only if the probe shows a stage you use being skipped, override under
`jira.statusMap` (scalar, ordered list, or a per-issue-type sub-map). See
[Jira status mapping](../../docs/reference/configuration.md#jira-status-mapping). Any status with no
mapping passes through verbatim as a single candidate.

**Estimated hours.** `estimated_effort_hours` is always written to Jira's built-in `timetracking.originalEstimate`. To also mirror it into a custom field (e.g. "Dev Estimate (hour)"), set its id under `jira.devEstimateField` in `skills-config.yaml` (or the `JIRA_DEV_ESTIMATE_FIELD` env var). The value is sent as a raw number. If Jira rejects the configured id, the sync warns, drops just that field, and retries. See [Jira estimate field](../../docs/reference/configuration.md#jira-estimate-field).

## Idempotent Create

When creating, the script first runs:

```
POST /rest/api/3/search/jql
Body: { "jql": "project = \"RB\" AND labels = \"synced-from-story.1.2.slug\"", "fields": ["summary","updated"], "maxResults": 5 }
```

> **Note**: this is the modern POST `/search/jql` endpoint. Atlassian deprecated the legacy GET `/rest/api/3/search` form on 1 May 2025 (returns `410 Gone` on migrated Jira Cloud tenants).

If a matching issue exists (because a prior POST succeeded but the local file did not get its `jira_key` written), the script switches to update mode against that key. Every create automatically appends the `synced-from-<dir>` label to enable this lookup on subsequent runs.

If multiple issues carry the same sync label (duplicates from prior failed runs), the first match is adopted and a warning is emitted listing all keys — clean up the duplicates manually in Jira.

## Parent Linkage

On create, the script:

1. Calls `/rest/api/3/project/<KEY>` to read `style` (`team_managed` or `classic`).
2. Sends `parent: { key: "PROJ-14" }` for team-managed, or `customfield_10014: "PROJ-14"` for classic.
3. If Jira responds 400 with a message mentioning `parent`/`epic_link`/`customfield_10014`, retries with the opposite field — handles instances where `style` and the actual accepted linkage disagree.

`JIRA_EPIC_LINK_FIELD` overrides the classic field id (default `customfield_10014`).

On **update**, parent linkage is **not** re-sent — Jira rejects parent edits on team-managed tracking issues, and re-parenting is rare. Move stories between epics manually in Jira if needed.

## Change Log Format

```markdown
<!-- jira-sync-changelog-start -->
## Change Log

| Date (UTC)       | Change                              |
|------------------|-------------------------------------|
| 2026-04-28 09:40 | Initial Jira story created          |
| 2026-04-28 11:05 | Updated: summary, description       |
<!-- jira-sync-changelog-end -->
```

If your story already has a hand-written `## Change Log` heading without HTML markers, the first sync **wraps it in markers in place** and preserves any existing `| date | change |` rows — no duplication. Entry rows are matched by a strict regex `^\|\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*\|`, so unrelated body markdown tables can't pollute the changelog.

## Story File Format

After sync the script writes (in-place, preserving order):

```yaml
jira_key: "PROJ-47"
jira_url: "https://yourorg.atlassian.net/browse/PROJ-47"
jira_epic: "PROJ-14"
epic_bitbucket_url: "https://bitbucket.org/org/repo/src/main/docs/prd/.../epic.N.name.md"
story_bitbucket_url: "https://bitbucket.org/org/repo/src/main/docs/prd/.../story.N.M.slug.md"
jira_last_synced_at: "2026-04-28T11:05:33.123+0000"
jira_last_body_hash: "f4b2c1d9a0e72b58"
jira_last_meta_hash: "a91c0aef33eb1d04"
```

## Description sections rendered

The script extracts and renders these story-doc headings into the Jira description:

1. User Story
2. Acceptance Criteria
3. Description

Each section's body is converted to ADF, with `- item` and `1. item` lines becoming proper bulletList / orderedList nodes.

## Script Options

| Flag | Short | Description |
|---|---|---|
| `--file` | `-f` | Path to story markdown file (required) |
| `--summary` | `-s` | Override story summary/title |
| `--priority` | `-p` | Override priority |
| `--labels` | `-l` | Comma-separated labels |
| `--doc-branch` | | Pin the Bitbucket Document links to this branch verbatim, overriding the current-branch/default-branch auto-resolution. Used by `finalise` (passes the durable integration branch) so a closed issue doesn't link to a deleted feature branch. |
| `--dry-run` | | Preview only — no Jira calls, no file writes |
| `--no-write` | | Run live Jira sync but skip the local file write-back. Useful for first-time adopters who want to inspect what would change in the markdown without committing the change. Differs from `--dry-run` in that the Jira side is updated. |
| `--force` | | Override the concurrent-edit guard |
| `--json` | | Suppress human output; emit a single JSON object on completion |
| `--quiet` | | Suppress info logs (warnings still printed) |

### `--json` output shape

```json
{
  "action": "update",
  "dryRun": false,
  "file": "/abs/path/story.md",
  "jira_key": "PROJ-47",
  "jira_url": "https://yourorg.atlassian.net/browse/PROJ-47",
  "jira_epic": "PROJ-14",
  "epic_bitbucket_url": "https://bitbucket.org/.../epic.md",
  "story_bitbucket_url": "https://bitbucket.org/.../story.md",
  "change_summary": "Updated: summary, description",
  "jira_last_synced_at": "2026-04-28T11:05:33.123+0000",
  "jira_last_body_hash": "f4b2c1d9a0e72b58",
  "jira_last_meta_hash": "a91c0aef33eb1d04"
}
```

On error: `{ "error": "<message>" }` and a non-zero exit code.

## Error Handling

| Error | Resolution |
|---|---|
| Missing `jira_epic` in frontmatter | Add `jira_epic: "RB-XX"` or run `/sync-jira-epic` first |
| Missing env vars (live) | Add to `.env` and retry |
| Missing env vars (dry-run) | Warning only — preview proceeds |
| `epic_source` not resolvable | If the existing frontmatter already has an `epic_bitbucket_url`, that value is reused (so the link is preserved across moves of the parent epic file). Otherwise, the epic Bitbucket link is omitted and sync continues. |
| Bitbucket URL not detected | Set `BITBUCKET_REPO_URL`; links omitted but sync continues |
| File not found | Verify story file path |
| `401 Unauthorized` | Verify `JIRA_USER_EMAIL` and `JIRA_API_TOKEN` |
| `403 Forbidden` | Token lacks permission for issue/project |
| `404 Not Found` | Issue key in `jira_key` does not exist (or no view permission) |
| Concurrent-edit guard tripped | Pull manual Jira edits into the markdown, or pass `--force` |
| `parent`/Epic Link 400 from Jira | Auto-retried with the other field; if that also fails, set `JIRA_EPIC_LINK_FIELD` for classic projects |
| Story issue type not found | Throws — verify `Story` is enabled for project |
| Backlog move failed (Kanban) | Warning only — story still created |
| 5xx / network error | Retried twice with exponential backoff before failing |
| 429 Too Many Requests | Retried twice; honours `Retry-After` header (seconds or HTTP-date), capped at 60s. Never indefinite. |
| Status transition unavailable | Warning only — sync still succeeds |

## Architecture

The script is a thin wrapper over `references/jira-sync.js`, which holds the shared primitives (frontmatter, ADF, changelog, http+retry, auth, diff, guard, board/transition/priority APIs, project-style detection). Shared with `sync-jira-task` and `sync-jira-epic`.

## Tests

```bash
node --test .agents/skills/sync-jira-story/tests/*.test.js
```

Covers frontmatter parsing (incl. `---` in body, YAML block arrays), changelog upsert / hand-written-heading rescue, diff + hash, priority normalisation, label sanitisation, concurrent-edit guard, ADF builder, and Jira error parser.

## Notes

- Jira is a **read-only mirror** — edit the markdown and re-sync; never edit Jira directly. The concurrent-edit guard enforces this.
- Uses Jira REST API **v3** with **ADF** for issue operations and Jira Agile REST API v1 for backlog placement. Existing stories synced via the older v2 plain-text version are upgraded to ADF on next sync.
- **Project style is cached** in `<repo>/.cache/jira-projectstyle-<PROJECT>.json` for 24 h, alongside the issue-type cache, so create-paths only hit `/rest/api/3/project/<KEY>` once per day. Delete the cache file to force a re-read.
- **Known limitation — concurrent-edit guard window.** The guard compares the locally stored `jira_last_synced_at` against the Jira `updated` timestamp at the start of an update. There is a small window between that check and the actual PUT during which a third party could land an edit; that change would be silently overwritten. The window is narrow and acceptable for a single-author / single-machine workflow but is not a hard guarantee. If multi-author Jira edits are common, prefer manual conflict resolution before each sync.
- API tokens: https://id.atlassian.com/manage-profile/security/api-tokens

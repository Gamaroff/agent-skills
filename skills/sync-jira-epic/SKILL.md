---
name: sync-jira-epic
description: Sync a local epic markdown file to Jira — creates the epic if it has no jira_key, updates it if jira_key is already set. Top-level work item (no parent). Embeds Bitbucket links to the parent PRD and epic file in the Jira description (rendered via ADF). Renders the Stories Breakdown overview table as a real ADF table in Jira. Writes a Change Log row on issue creation and on status transition only (not on body updates). Concurrent-edit guard via stored Jira `updated` timestamp. Drives Jira status from frontmatter `status` via Jira transitions. Use when the user says "create this epic in Jira", "update this epic in Jira", "sync epic to Jira", "push epic changes to Jira", or "publish epic to Jira".
---

# sync-jira-epic

## Purpose

One-way sync of a local epic markdown file to Jira. Auto-detects create vs update from `jira_key` in frontmatter.

| `jira_key` present? | Action |
|---|---|
| Absent | **Pre-flight search by sync label**, then **Create** if no match. Writes `jira_key` back to file. |
| Present | **Update** existing Jira epic via atomic PUT. A Change Log row is written only if the status transitioned. |

**Difference from `sync-jira-story`:** epics are **top-level** — no parent issue. Issue type sent as `Epic`. Sets the Epic Name customfield (`customfield_10011` by default) on create, with auto-retry that drops the field if the project rejects it (typical of team-managed projects).

## Key features

- **Idempotent create** — pre-flight JQL search by `synced-from-<epic-dir>` label prevents duplicates if a previous POST left no `jira_key` in the file. Uses Jira's new `POST /rest/api/3/search/jql` endpoint (the legacy `GET /search` was retired May 2025).
- **Atomic PUT** — uses `?returnIssue=true` so the fresh `updated` timestamp comes back in one round-trip.
- **No-change fast path** — if no fields changed, the Jira PUT is skipped entirely **and** the Change Log is left alone (no noise rows for no-op syncs). Pass `--force` to push a no-op update anyway.
- **Concurrent-edit guard** — stores Jira `fields.updated` in frontmatter as `jira_last_synced_at`. Aborts on next sync if Jira advanced (use `--force` to override).
- **Field-level diff** — Change Log entries say `Updated: summary, description, metadata` etc. Body and metadata hashes are stored separately (`jira_last_body_hash`, `jira_last_meta_hash`) so frontmatter changes (status/sprints/epic_type) don't masquerade as description changes.
- **Status transitions** — frontmatter `status` is mapped (emoji-stripped, lowercased) to Jira's transition list and POSTed to `/transitions` after sync.
- **Live priority resolution** — fetches `/rest/api/3/priority` and matches user input against the actual Jira instance, falling back to a built-in synonym map (`critical`→`Highest`, etc.).
- **Issue type cache** — Jira `Epic` type id is cached to `<repo>/.cache/jira-issuetypes-<PROJECT>.json` for 24h.
- **Stories Breakdown ADF table** — the markdown `## Stories Breakdown` table is rendered as a real ADF table (header row + data rows) in the Jira description, not raw pipes. Inline markdown links (`[label](url)`) inside cells render as ADF link marks. Escaped pipes (`\|`) in cells are preserved.
- **PRD path resolution** — `prd_source` frontmatter is resolved through multiple path conventions (`${PRD_ROOT}/<domain>/<feature>/prd.<feature>.md`, basename match) before giving up. `${PRD_ROOT}` resolves via `references/resolve-paths.sh` (default: `docs/prd`).
- **Bullet/ordered lists** — body sections containing `- item` or `1. item` lines render as proper ADF lists, not paragraphs with hard-breaks.
- **Current-branch Bitbucket URLs** — links use the current branch's remote-tracking branch (e.g. `origin/feature/...`), falling back to the default branch (`origin/HEAD`, e.g. `main`) when there is no upstream or HEAD is detached. Feature branches are deleted post-merge, so re-sync from `develop`/`main` (or pass `--doc-branch`) after merge to pin a durable link.
- **HTTP retry** — automatic retry with exponential backoff on 5xx and network errors. 4xx responses fail fast.
- **Backlog placement (Scrum only)** — board type is detected via `/rest/agile/1.0/board/{id}/configuration`. Skipped on Kanban with a warning. Single board per env (`JIRA_BOARD_ID`); multi-board projects must run the script per board ID.
- **In-place frontmatter updates** — `jira_*` keys are updated where they sit, not stripped and re-appended. Clean diffs.
- **`--json` / `--quiet`** for CI / pipeline use.
- **`--verbose` / `-v`** dumps the resolved Jira PUT/POST payload (fields + ADF description) before sending — handy when a Jira 400 is unclear.
- **`--version` / `-V`** prints the script version and exits.
- **Pluggable fetch** — `module.exports.run({ fetchImpl })` accepts an injected fetch for tests.

## When to Use

- "Create this epic in Jira"
- "Sync / push / update this epic to Jira"
- "I've edited the epic, push changes to Jira"
- "Publish this epic file to Jira"

## Prerequisites

### Resolve paths

Source `references/resolve-paths.sh` to populate `${PRD_ROOT}` (default `docs/prd`). Path references below substitute this env var.

### Required Files

- An epic markdown file at:
  `${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<name>/epic.<N>.<name>.md`
- Optionally: `prd_source` pointing to the parent PRD file for Bitbucket link generation.

### Required Environment Variables

The script auto-loads `<repo-root>/.env`. Shell exports take precedence.

| Variable | Description |
|---|---|
| `JIRA_URL` | Jira base URL (e.g. `https://yourorg.atlassian.net`) |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_USER_EMAIL` | Jira account email |
| `JIRA_PROJECT_KEY` | Project key (e.g. `RB`) |

### Optional Environment Variables

| Variable | Description |
|---|---|
| `JIRA_BOARD_ID` | Board ID for backlog placement (Scrum boards only — skipped on Kanban) |
| `BITBUCKET_REPO_URL` | Override Bitbucket base URL (auto-detected from git remote) |
| `JIRA_EPIC_NAME_FIELD` | Custom field id for the Epic Name (classic projects only). Defaults to `customfield_10011`. Set to `none` to skip entirely (recommended for team-managed projects, though the script auto-retries without the field on rejection). |

### Frontmatter constraints (non-full-YAML parser)

The script ships its own minimal YAML parser. Supported:

- Top-level `key: value` scalar pairs.
- Inline arrays `[a, b, "c d"]`.
- Block arrays (indented `- item` lines under a bare key).
- Outer matched single or double quotes on string values.

Not supported: nested mappings, anchors, aliases, escape sequences, multi-doc, flow mappings, comments inside the frontmatter block. Document body may contain `---` horizontal rules (close-tag is detected by scanning for `\n---` after the opener).

### Epic frontmatter fields

```yaml
title: 'Epic 1: NX Workspace Foundation'
prd_source: 'docs/prd/build/setup-nx-monorepo/prd.setup-nx-monorepo.md'  # literal repo path (substitute ${PRD_ROOT} if custom)
epic_type: 'foundation'
priority: 'high'
estimated_sprints: 2
status: '📋 Planned'                # emoji stripped, mapped to Jira transition
labels: ['foundation']              # synced-from-* label appended automatically
assignee: '5b10a2844c20165700ede21g'
components: ['Build']
fix_versions: ['1.0.0']
due_date: '2026-05-15'
```

## Workflow

### 1. Identify the Epic File

```
${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<slug>/epic.<N>.<slug>.md
```

To find epics that have **not yet been synced** (no `jira_key`):

```bash
grep -L 'jira_key:' $(find "$PRD_ROOT" -path '*/epics/*/epic.*.md' -not -path '*/stories/*')
```

### 2. Optional — Dry Run

```bash
node .agents/skills/sync-jira-epic/scripts/sync-jira-epic.js \
  --file <epic-file-path> \
  --dry-run
```

In dry-run, missing env vars are reported as warnings (not fatal), so you can preview the call shape.

### 3. Sync the Epic

```bash
node .agents/skills/sync-jira-epic/scripts/sync-jira-epic.js \
  --file <epic-file-path>
```

Flow:

1. Parse the epic file (frontmatter + body) — safe against `---` horizontal rules in the body.
2. Resolve auth, Bitbucket repo URL + branch (current branch's upstream, falling back to the default branch), and load live Jira priorities.
3. Resolve `prd_source` to a Bitbucket URL via the multi-variant lookup; fall back to `prd_bitbucket_url` frontmatter if present.
4. If `jira_key` absent: search for an issue carrying the file's `synced-from-*` label. If found, switch to update.
5. Detect create vs update; on update fetch current state and run concurrent-edit guard.
6. Diff `summary`, body hash, meta hash, priority, labels.
7. Build a Jira ADF description: Summary → Metadata → Stories Breakdown overview table → Source links.
8. Resolve cached `Epic` issue type id (or fetch + cache).
9. **Create** (POST, with Epic-Name-field auto-retry on 400) or **Update** (atomic PUT with `returnIssue=true`).
10. **No-change fast path:** on update, if no fields changed, skip the PUT. The status transition still runs on this path — an epic whose frontmatter status moved while its card body did not must still reach the board, and a transition here is the one thing that earns a Change Log row. If nothing transitioned either, the run writes no row and no file at all. Use `--force` to push the PUT anyway.
11. On create: detect board type. If Scrum, move to backlog via Agile API. If Kanban, skip with a warning.
12. If frontmatter `status` differs from current Jira status, fetch transitions and POST a status transition.
13. Update local file: in-place frontmatter for `jira_key`, `jira_url`, `jira_last_synced_at`, `jira_last_body_hash`, `jira_last_meta_hash`. Inline `**Jira Epic**` / `**Parent PRD**` / `**Epic File**` links — the document links are **relative**, not absolute Bitbucket URLs. `epic_bitbucket_url` / `prd_bitbucket_url` are no longer written; `prd_bitbucket_url` is still READ as the `prd_source` fallback in step 3. Append a Change Log row only for issue creation or a status transition — never for a body update.

### 4. Report to User

- ✅ Jira epic key (e.g. `PROJ-14`)
- ✅ Jira URL
- ✅ Added to backlog (or Kanban warning)
- ✅ Status transition (if applicable)
- ✅ Change log entry appended
- ✅ Epic frontmatter updated (incl. `jira_last_synced_at` + body/meta hashes)
- 📌 Story reminder: `jira_epic` to copy into stories

### 5. Regenerate the PRD Epic Index

The sync above may transition the epic's `status`. The parent PRD's epic index shows each
epic's status, so refresh it after the sync completes so PRD→epic statuses stay current. This
is an agent post-step — the sync script itself does not touch the PRD index. Idempotent and
low-cost: it rewrites only PRD files whose index actually changed.

With `${PRD_ROOT}` resolved (source `references/resolve-paths.sh` if not already — see
Prerequisites), run the generator from this skill's bundled reference:

```bash
node references/generate-prd-epic-index.mjs --prd-root "${PRD_ROOT}"
```

In a consumer repo the same logic is vendored at `scripts/generate-prd-epic-index.mjs`
(what the consumer's `docs:epic-index` CI uses); running either produces identical output.
If any `prd.*.md` changed, stage it in the same commit as the epic-frontmatter updates.

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
| `draft`, `planned` | `To Do`, `Backlog`, `Open`, `New`, `Selected for Development` |
| `ready-for-development` | `To Do`, `Backlog`, `Open`, `New`, `Selected for Development`, `Ready`, `Ready for Development` |
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
node scripts/sync-jira-epic.js --probe-workflow
```

**Custom workflow vocabulary.** Only if the probe shows a stage you use being skipped, override under
`jira.statusMap` (scalar, ordered list, or a per-issue-type sub-map). See
[Jira status mapping](../../docs/reference/configuration.md#jira-status-mapping). Any status with no
mapping passes through verbatim as a single candidate.

## Idempotent Create

When creating, the script first runs:

```
POST /rest/api/3/search/jql
{ "jql": "project = \"RB\" AND labels = \"synced-from-epic.1.foundation\"",
  "fields": ["summary", "updated"], "maxResults": 2 }
```

If a matching issue exists (because a prior POST succeeded but the local file did not get its `jira_key` written), the script switches to update mode against that key. Every create automatically appends the `synced-from-<dir>` label to enable this lookup on subsequent runs.

> **Endpoint migration:** Atlassian retired `GET /rest/api/3/search` in May 2025. This script uses the replacement `POST /rest/api/3/search/jql`. Older clones of the script that still hit the legacy `GET` will see `410 Gone` on migrated tenants — re-run the latest version.

## Epic Name Customfield

Many classic Jira Cloud projects require an Epic Name field separate from `summary`. The script:

1. Sends `customfield_10011: <summary>` on create by default.
2. If Jira responds 400 with a message mentioning `customfield_10011` or `epic name`, retries the POST without the field — typical for team-managed projects where the field doesn't exist.

Override the field id with `JIRA_EPIC_NAME_FIELD`, or set it to `none` to skip the field outright.

## Stories Breakdown Rendering

If your epic markdown has a `## Stories Breakdown` section with a pipe-table, the script extracts the rows and renders them as an **ADF table** in the Jira description (header row + data rows). Plain pipes are not rendered as tables in Jira ADF — this is an explicit conversion.

## Change Log

The format is not restated here — it is defined once in
[document-change-log.md](references/document-change-log.md), and the engine that
writes it is `references/change-log.js`. Markers are `<!-- change-log-start -->` /
`<!-- change-log-end -->`; a document still carrying the superseded
`<!-- jira-sync-changelog-* -->` pair is migrated in place on the first sync that
writes for another reason.

**A row is written for exactly two events:**

| Event | Row |
| --- | --- |
| Issue created | `\| 2026-08-12 \|  \| Jira epic created (PROJ-42) \| sync-jira-epic \|` |
| Status transition driven from frontmatter | `\| 2026-08-12 \|  \| Status → in-progress \| sync-jira-epic \|` |

**A body, summary, priority or label update writes no row.** Jira keeps a full
issue history with actor and timestamp — strictly better than a local row naming
only which fields moved — and the document records *why* the body changed through
its own review, develop and QA rows. `jira_last_synced_at` in frontmatter still
records the last sync time.

A sync that changes nothing writes nothing at all: no row, no marker migration,
no file write. Migration happens inside the row write, so it can never fire on the
no-op path and churn every document on every sync.

The local file holds the changelog history and is the source of truth for it. The Jira description does **not** publish it at all — Jira keeps its own issue history, so a third copy on the card grew on every sync and told a reader nothing new. No-change syncs (no-op fast path) skip writing a Change Log row entirely — only real changes are recorded.

## Epic File Format

After sync the script writes (in-place, preserving order):

```yaml
jira_key: "PROJ-14"
jira_url: "https://yourorg.atlassian.net/browse/PROJ-14"
jira_last_synced_at: "2026-04-28T11:05:33.123+0000"
jira_last_body_hash: "f4b2c1d9a0e72b58"
jira_last_meta_hash: "a91c0aef33eb1d04"
```

## Description sections rendered

The Jira card is a **summary that points at the epic document**, not a copy of
it. The contract — which sections, what caps, how omissions are announced — is
specified once in [`references/tracker-card-summary.md`](./references/tracker-card-summary.md)
and enforced in code by `buildCardSections()` in `references/jira-sync.js`.

What lands on an epic card:

| Block | Source |
|-------|--------|
| Summary | `## Epic Goal`, falling back to `## Epic Description` (with `**Existing System Context:**` etc. flattened to plain `Existing System Context:`) |
| Stories Breakdown | the **overview table only**, found wherever it sits (typically under `### Stories Overview`); the per-story `###` blocks are not published |
| Metadata | type, PRD, estimated sprints, status |
| Source Documents | epic file, parent PRD, child stories |

Each section's body is converted to ADF, with `- item` and `1. item` lines
becoming proper bulletList / orderedList nodes. Anything trimmed is followed by a
`+N more in …` link to the epic document. The document's Change Log is **never**
published to the card, and the old fixed "Story Requirements" paragraph is gone —
it told story authors which frontmatter keys to set, which is repo authoring
guidance, not information for a card reader.

## Script Options

| Flag | Short | Description |
|---|---|---|
| `--file` | `-f` | Path to epic markdown file (required) |
| `--summary` | `-s` | Override epic summary/title |
| `--priority` | `-p` | Override priority |
| `--labels` | `-l` | Comma-separated labels |
| `--doc-branch` | | Pin the Bitbucket Document links to this branch verbatim, overriding the current-branch/default-branch auto-resolution. Lets a post-merge re-sync point links at the durable integration branch instead of a deleted feature branch. |
| `--no-transition` | | Re-point links / refresh the description **without** driving the issue's status. The sync normally resolves frontmatter `status:` through its own `loadStatusMap` and transitions the card; with this flag it issues no status request at all. Passed by `finalise` Step 7's Document-link re-point, so the re-link cannot overrule the terminal status the tracker-workflow ladder just set (bug.11). Composes with `--fail-on-status-skip` — a suppressed transition is a run behaving as configured, and exits 0. |
| `--check-card` | | **Offline preflight** — check the document against the card spec and exit. No auth, no network, no writes. Exit 0 = every card block resolves; exit 1 = findings, each printed with its fix. Add `--json` for `{ok, findings, blocks}`. Used by `review-epic` to catch a heading mismatch before it publishes a thin card. |
| `--dry-run` | | Preview only — no Jira calls, no file writes |
| `--force` | | Override the concurrent-edit guard AND the no-change fast path |
| `--json` | | Suppress human output; emit a single JSON object on completion |
| `--quiet` | | Suppress info logs (warnings still printed) |
| `--verbose` | `-v` | Print resolved Jira fields + ADF description before sending |
| `--version` | `-V` | Print script version and exit |

### `--json` output shape

```json
{
  "action": "update",
  "dryRun": false,
  "file": "/abs/path/epic.md",
  "jira_key": "PROJ-14",
  "jira_url": "https://yourorg.atlassian.net/browse/PROJ-14",
  "epic_bitbucket_url": "https://bitbucket.org/org/repo/src/main/docs/prd/.../epic.N.name.md",
  "prd_bitbucket_url": "https://bitbucket.org/org/repo/src/main/docs/prd/.../prd.<feature>.md",
  "change_summary": "Updated: summary, description",
  "jira_last_synced_at": "2026-04-28T11:05:33.123+0000",
  "jira_last_body_hash": "f4b2c1d9a0e72b58",
  "jira_last_meta_hash": "a91c0aef33eb1d04",
  "reason": null,
  "record": null
}
```

`reason` is `"deferred"` and `record` carries the journal record id when
`access.tracker` is not `full`: the Jira write was **refused and recorded**, not
performed. A deferred *create* also returns `jira_key: null` — never a
placeholder — so the next unrestricted run creates the issue exactly once. See
[`references/tracker-access-record.md`](references/tracker-access-record.md)
for the record and the roster of kinds.

The `*_bitbucket_url` keys report the absolute Bitbucket URL used for the **Jira** link,
built at render time. They are **not** written to the document — the file gets a relative
link (see [Why document links are relative](../sync-jira-task/SKILL.md#why-document-links-are-relative)).
The two look identical and are not, which is how they were once wrongly deleted from here.

`action` is `"skip"` when the no-change fast path triggered. On error: `{ "error": "<message>" }` and a non-zero exit code.

## Error Handling

| Error | Resolution |
|---|---|
| Missing env vars (live) | Add to `.env` and retry |
| Missing env vars (dry-run) | Warning only — preview proceeds |
| `prd_source` not resolvable | PRD link omitted; sync continues |
| Bitbucket URL not detected | Set `BITBUCKET_REPO_URL`; links omitted but sync continues |
| File not found | Verify epic file path |
| `401 Unauthorized` | Verify `JIRA_USER_EMAIL` and `JIRA_API_TOKEN` |
| `403 Forbidden` | Token lacks permission for issue/project |
| `404 Not Found` | Issue key in `jira_key` does not exist (or no view permission) |
| Concurrent-edit guard tripped | Pull manual Jira edits into the markdown, or pass `--force` |
| Epic Name customfield 400 from Jira | Auto-retried without the field; if that also fails, set `JIRA_EPIC_NAME_FIELD=none` |
| Epic issue type not found | Throws — verify `Epic` is enabled for project |
| Backlog move failed (Kanban / no board) | Warning only — epic still created |
| 5xx / network error | Retried twice with exponential backoff before failing |
| Status transition unavailable | Warning only — sync still succeeds |

## Architecture

The script is a thin wrapper over `references/jira-sync.js`, which holds the shared primitives (frontmatter, ADF, changelog, http+retry, auth, diff, guard, board/transition/priority APIs, project-style detection). Shared with `sync-jira-task` and `sync-jira-story`.

**Migration note:** older versions of this script used Jira REST API v2 with a plain-text description. Existing epics synced via that older version are upgraded to v3+ADF on the next sync — the body of the Jira description will look different (real tables, real bullet lists, real headings) but `jira_key` and the epic key itself are unchanged.

## Tests

```bash
node --test .agents/skills/sync-jira-epic/tests/*.test.js
```

Covers frontmatter parsing (incl. `---` in body), changelog upsert / hand-written-heading rescue, body/meta hash split, ADF builder + Stories Breakdown table (incl. inline links + escaped pipes), PRD path resolution, full status map (incl. Backlog / In Review / Ready / Won't Do), `syncLabelFor` derivation, in-place frontmatter update, Jira error parser, `findExistingByLabel` POST `/search/jql` shape, `fetchUpdatedTimestamp` non-throwing variant, `guardConcurrentEdit` (incl. `--force` override path), `collectCreateFields` vs `collectUpdateFields` field shape, and `--verbose` / `--version` flag parsing.

## Notes

- Jira is a **read-only mirror** — edit the markdown and re-sync; never edit Jira directly.
- Uses Jira REST API **v3** with **ADF** for issue operations and Jira Agile REST API v1 for board / backlog operations.
- API tokens: https://id.atlassian.com/manage-profile/security/api-tokens

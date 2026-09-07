---
name: sync-jira-bug
description: Sync a local bug report markdown file to Jira — creates the bug if it has no jira_key, updates it if jira_key is already set. Handles all three bug modes (story bug, task bug, general bug), inferred from the file's own path. The card is a sibling, not a child — the parent relationship travels as a Jira issue link plus link-marked entries in a Source Documents section pointing at the bug report, its parent document, its parent's card and (story mode) the epic. Adds the bug to the project backlog (Scrum boards only). Idempotent create via "synced-from-*" label search. Reads bug files with or without YAML frontmatter, and prepends a minimal block to those without one. Writes Status History rows — never a Change Log, which bug reports are barred from carrying — on issue creation and status transition only. Concurrent-edit guard via stored Jira `updated` timestamp. Use when the user says "create this bug in Jira", "update this bug in Jira", "sync bug to Jira", "push bug changes to Jira", or "publish bug to Jira".
---

# sync-jira-bug

## Purpose

One-way sync of a local bug report to Jira. Auto-detects create vs update from `jira_key`.

| `jira_key` present? | Action |
| --- | --- |
| Absent / null | **Pre-flight dedup search by `synced-from-*` label**, then **Create** if no match. Writes `jira_key` + `jira_url` back to the file. |
| Present | **Update** the existing issue (summary, description, priority, labels), reconcile status from the bug's lifecycle. A Status History row is written only if the status transitioned. |

**Difference from `sync-jira-task`:** a bug is not standalone — it hangs off a story, a task, or the bug registry — but it is not a *child* either. See [Parent linkage](#parent-linkage). It also carries `## Status History` in place of `## Change Log`, and it must read files that have no frontmatter at all.

## Key features

- **Three modes, inferred, never asked for** — story bug, task bug, general bug, from the file's own path.
- **Parent linkage that a board can see** — a real Jira issue link, type resolved by runtime introspection.
- **Source Documents** — link-marked entries to the bug report, the parent document, the parent's card, the epic (story mode) and the bug's own durable artifacts.
- **Both file shapes** — YAML frontmatter or a `**Bug ID**:` header block, or both.
- **Frontmatter adoption** — a file without frontmatter gets a minimal block prepended; its body is untouched.
- **Status History rows**, on creation and status transition only.
- **Idempotent create** via a label derived from the bug's own filename stem.
- **Concurrent-edit guard** on the stored Jira `updated` timestamp (`--force` overrides).
- **Backlog placement (Scrum only)** — board type detected via `/rest/agile/1.0/board/{id}/configuration`; skipped on Kanban with a warning.
- **Relative document links**, absolutised to Bitbucket URLs at ADF-render time.
- **Deferral-aware** — a restricted `access.tracker` records the create, the update, the link and the transition rather than performing them, and never writes a placeholder key.
- `--json` / `--quiet` / `--dry-run` / `--force` / `--check-card` / `--no-transition` / `--no-link`.

## When to Use

- "Create this bug in Jira"
- "Sync / push / update this bug to Jira"
- "Publish this bug report to Jira"
- From `develop-bug` Step 1, via the `ensure-bug-jira-issue` sub-routine.

## When NOT to Use

- The document is a story, task or epic → use the matching `/sync-jira-{story,task,epic}`.
- Project tracks via GitHub → use `/sync-github-bug`.

## Prerequisites

### Required Files

A bug report in one of the three documented layouts:

```
docs/prd/<...>/story.{e}.{s}.bug.{n}.{name}.md     # story bug
docs/tasks/task.{id}.{name}/task.{id}.bug.{n}.{name}.md   # task bug
docs/bugs/bug.{N}.{name}/bug.{N}.{name}.md                # general bug
```

### Required Environment Variables

`JIRA_URL`, `JIRA_API_TOKEN`, `JIRA_USER_EMAIL`, `JIRA_PROJECT_KEY`. `JIRA_BOARD_ID` is needed for backlog placement; without it the bug is created but not placed, with a warning.

### Optional Environment Variables

| Variable | Effect |
| --- | --- |
| `JIRA_SEVERITY_FIELD` | Custom field id to receive the bug's severity as a select option. Also readable as `jira.severityField` in `skills-config.yaml`. Unset → severity travels in the description's Metadata line only. |
| `JIRA_DEFAULT_ASSIGNEE` | Fallback assignee accountId. Frontmatter `assignee` overrides it. |
| `BITBUCKET_REPO_URL` | Repo base for document links, when it cannot be derived from `git remote`. |
| `JIRA_DOC_BRANCH` | Pins the branch document links point at. Also `jira.docBranch` / `developNext.baseBranch`. |

### Bug file format

Either shape is read. The two are merged per key, with frontmatter winning:

```yaml
---
type: bug
status: new # new | in-progress | ready-for-qa | closed | reopened
severity: 'Major'
priority: 'High'
created: 2026-09-07
related: 'story 7.4'
description: 'One-line summary of the bug'
---
```

```markdown
**Bug ID**: story.7.4.bug.4
**Related**: [story 7.4](./story.7.4.tap-targets.md)
**Status**: ✅ Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-09-07
```

The emoji vocabulary (`🆕 New`, `🔄 In Progress`, `✅ Ready for QA`, `✅ Closed`, `⚠️ Reopened`) is stripped before the value is mapped, and loose spellings (`Fixed`, `Resolved`, `In QA`) are normalised onto the documented enum.

## Workflow

### 1. Identify the Bug File

To find bugs that have **not yet been synced**:

```bash
grep -rL 'jira_key:' $(find docs -name '*bug*.md' -not -name '*.review.*' \
  -not -name '*.qa.*' -not -name '*.dod.*' -not -name '*.implementation.*' \
  -not -name 'bug-registry.md')
```

### 2. Optional — Preflight and Dry Run

```bash
node scripts/sync-jira-bug.js --file <bug.md> --check-card   # offline, no auth
node scripts/sync-jira-bug.js --file <bug.md> --dry-run --json
```

`--check-card` resolves the card's blocks against the document and exits 1 on findings. `--dry-run --json` additionally reports the inferred `bug_mode`, `parent_doc` and `parent_key` — the fastest way to confirm the skill has placed a bug correctly before it writes anything.

### 3. Sync the Bug

```bash
node scripts/sync-jira-bug.js --file <bug.md>
```

The script:

1. Parses frontmatter *and* the `**Bug ID**:` header block; merges them.
2. Infers the mode from the path and warns — without obeying — when `related:` disagrees.
3. Resolves auth, the Bitbucket repo base and the document branch.
4. Resolves the parent document, its `jira_key`, and (story mode) the epic document.
5. If `jira_key` is absent, searches for an issue carrying this bug's `synced-from-*` label; on a hit, switches to update.
6. On update: fetches current state and runs the concurrent-edit guard; diffs summary, body hash, meta hash, priority, labels.
7. Builds the ADF description: Summary → Reproduction → Impact → Metadata → Source Documents.
8. Creates (POST) or updates (atomic PUT with `returnIssue=true`).
9. On create: places the issue in the backlog (Scrum boards only).
10. Links the card to the parent's card, idempotently.
11. Drives the Jira status from the bug's lifecycle status.
12. Writes back: frontmatter keys, the `**Jira**` and `**Bug File**` lines, and a Status History row for creation or transition.

### 4. Report to User

Bug mode and id · Jira key and URL · parent document and parent card · link outcome · backlog placement · status reconciliation · Status History row (or none) · whether frontmatter was adopted.

## Parent linkage

**The bug card is a sibling of its parent's card, never a child of it. The relationship travels as a Jira issue link.**

This is a deliberate decision and the reasoning matters, because the obvious alternative looks better than it is.

In a **team-managed** project a Bug is a *standard* issue type, at the same level as a Story. Its `parent` field can only address an Epic. Making a bug a child of a **story** requires changing it to a **sub-task** type, and that is not a neutral change:

- Sub-task type names differ per board (`Sub-task`, `Subtask`, `Sub-bug`, or absent entirely), so the skill would have to guess at a name it is forbidden to hardcode.
- A sub-task has no independent backlog placement and, on most boards, no sprint of its own — so the bug would stop being schedulable work.
- Sub-task workflows are frequently a different, shorter workflow than the project's standard one, which would break the status mapping this skill shares with its siblings.

In a **company-managed** project, `parent` on a standard issue *is* the Epic Link — so it addresses the epic, not the story, and pointing it at a story key is simply invalid.

So a sub-task bug would be worse on three axes to buy one line in a hierarchy panel. An **issue link** gives the relationship every project type supports, that JQL can query (`issue in linkedIssues("PROJ-123")`), and that the board's link panel renders — at the cost of not appearing in the backlog hierarchy, which is the correct trade.

The link type is **resolved at runtime**, never hardcoded: `GET /rest/api/3/issueLinkType` is matched against the candidate list `Relates → Relates To → Related → Problem/Incident → Blocks`, cached for 24 h in `.cache/jira-linktypes.json`. A board offering none of them reports `no-link-type` and the card keeps its description links alone — a degraded success, not a failure.

**The link is attempted on every run, not only on create.** A bug is frequently filed before its parent has a card, and `linkIssues` is idempotent (it reads `fields=issuelinks` first and returns `already` on a match), so a later re-sync is how the link eventually lands. Without the pre-read, Jira would happily create a second identical link on every sync.

| Mode | Issue link | `Source Documents` |
| --- | --- | --- |
| story | → parent story's card | Bug report · Parent story document · Parent card · Parent epic · durable siblings |
| task | → parent task's card | Bug report · Parent task document · Parent card · durable siblings |
| general | none | Bug report · Bug registry |

A general bug is anchored to the registry and to nothing else — that is what "cross-cutting, no single owner" means. Giving it a parent would be inventing one.

**This skill never creates the parent's card.** A parent with no `jira_key` is linked as a document, with an informational message saying to sync the parent and re-run. Creating an issue as a side effect of syncing a different document is how orphan cards appear.

## Concurrent-Edit Guard

| Situation | Behaviour |
| --- | --- |
| Jira `updated` ≤ stored `jira_last_synced_at` | Sync proceeds normally |
| Jira `updated` > stored | **Aborts**; pass `--force` to override |
| `--force` | Warning, sync proceeds, overwrites Jira |
| First sync (no stored timestamp) | Guard skipped |

A file that has just had frontmatter adopted has no stored timestamp, so its first sync is unguarded by construction.

## Status Transitions

The bug lifecycle is **not** the document lifecycle, and the two are deliberately not mapped onto each other. Bug statuses are:

| Bug status | Candidate Jira statuses, in order |
| --- | --- |
| `new` | To Do · Backlog · Open · New · Selected for Development |
| `in-progress` | In Progress · Doing · Started · Development |
| `ready-for-qa` | Testing · Ready for Testing · In Testing · QA · In QA |
| `closed` | Closed · Done · Resolved · Complete · Completed |
| `reopened` | Reopened · Reopen, then the `new` list |

Resolution is by runtime introspection, exactly as in the sibling skills: `GET /issue/{key}/transitions?expand=transitions.fields`, matched first on `to.name`, then on the transition's own name, then — for terminal statuses only — on an unambiguous `statusCategory=done`. `closed` counts as terminal; `reopened` does not.

**A reopened bug moves backwards, and that is allowed.** The monotonicity guard that stops a resumed pipeline dragging a card back down the ladder is driven by a caller-declared rank, and this skill declares none — so `closed → reopened` resolves like any other transition.

Override per project in `skills-config.yaml`:

```yaml
jira:
  statusMap:
    bug:
      ready-for-qa: ['Verification', 'In Verification']
      closed: ['Closed']
```

Diagnose a board with `--probe-workflow`, which is read-only.

## Idempotent Create

```
POST /rest/api/3/search/jql
{"jql": "project = \"RB\" AND labels = \"synced-from-story.7.4.bug.4.tap-target\"", "maxResults": 2}
```

If a matching issue exists — because a prior POST succeeded but the write-back did not — the script switches to update mode against that key. Every create appends the `synced-from-<bug stem>` label to enable this on subsequent runs.

**The label is derived from the bug file's own stem, not from its directory.** `sync-jira-task` labels by directory basename, which is unique because a task owns its directory. A bug does not: a story bug shares a directory with its story, that story's QA reports and every sibling bug. Labelling by directory would give all of them the same label, and this search would then adopt the first card it found — so bug 2 would silently update bug 1's card. This label is the sole guarantor of idempotent create when the write-back fails, so it must be unique per bug.

## Status History

**Bug reports carry no Change Log.** `## Status History` is the bug-type equivalent and is richer — it has a `Status` column, which is what a bug's history is actually about. The exclusion is stated in [`document-change-log.md`](references/document-change-log.md) §Exclusions and in `docs/standards/bug-documents.md`; the engine is [`status-history.js`](references/status-history.js), the peer of `change-log.js`.

Table shape is `| Date | Status | Changed By | Notes |`. A section that does not exist is created immediately before `## Resolution Summary`, which is where the bug template puts it — never at the top of the document.

**A row is written for exactly two events:**

| Event | Row |
| --- | --- |
| Issue created | `\| 2026-09-07 \| in-progress \| sync-jira-bug \| Jira bug created (PROJ-42) \|` |
| Status transition that actually fired | `\| 2026-09-07 \| closed \| sync-jira-bug \| Jira card moved to "Done" \|` |

The `Status` cell is the bug's **current lifecycle status**, not the Jira column it landed in. A Jira column name is not a bug lifecycle word, and putting one in that column is how the two vocabularies get conflated.

**A summary, description, priority or label update writes no row.** Jira keeps a full issue history with actor and timestamp. A sync that changes nothing writes nothing at all — no row, byte-identical file, empty `git diff`.

## Frontmatter adoption

About half the bug documents in a mature repo predate the `create-bug-report` template and open with a `**Bug ID**:` header block instead of YAML. On those files `upsertFrontmatterKeys` returns its input **unchanged, and silently** — so the issue is created, the link line is written, and `jira_key` is never persisted. The next run then creates a duplicate unless the label search rescues it.

So a file with no frontmatter has a minimal block prepended, seeded from its header block:

```yaml
---
type: "bug"
status: "closed"
severity: "Major"
priority: "High"
created: "2026-07-21"
related: "story 7.4"
---
```

The body below it is concatenated verbatim — this is a prepend, not a rewrite — and the operation is idempotent. Quote style follows the repo's Prettier config, so the file the sync authors is not left dirty by the formatter that runs next. `review-bug` flags a bold-line header with no YAML block as **Critical**, so adoption clears an existing finding rather than creating one.

## Description sections rendered

| Card block | Document section |
| --- | --- |
| Summary | `## Bug Description`, first 4 sentences |
| Reproduction | `## Reproduction Steps`, capped at 5 |
| Impact | `## Scope & Impact` / `## Acceptance Criteria Violation` / `## Success Criteria Violation`, capped at 5 — optional |
| Metadata | severity, priority, status, created, related |
| Source Documents | the mode-dependent link list above |

The three violation headings are one spec with an alias array, which is what keeps mode out of the card builder. `## Evidence` is deliberately excluded: screenshots, log dumps and stack traces are the largest part of a bug report and the fastest to go stale, and the card is a pointer at the document, not a copy of it. Caps and rationale: [`tracker-card-summary.md`](references/tracker-card-summary.md). The document's history is **never** published to the card.

## Script Options

| Flag | Effect |
| --- | --- |
| `--file` / `-f` | Bug markdown path (required) |
| `--summary` / `-s` | Override the summary |
| `--priority` / `-p` | Override the priority |
| `--labels` / `-l` | Comma-separated extra labels (the sync label is always appended) |
| `--doc-branch <name>` | Pin the branch document links point at |
| `--check-card` | Offline preflight; exit 1 on findings |
| `--dry-run` | No Jira calls, no writes |
| `--force` | Disable the concurrent-edit guard |
| `--no-transition` | Refresh the card without driving its status |
| `--no-link` | Refresh the card without touching issue links |
| `--json` / `--quiet` | Machine output / suppress info |
| `--fail-on-status-skip` | Exit 1 when a status transition was skipped |
| `--probe-workflow` [`--write-record <p>`] | Read-only board introspection |

### `--json` output shape

```json
{
  "action": "create",
  "file": "/abs/path/story.7.4.bug.4.tap-target.md",
  "bug_mode": "story",
  "bug_id": "story.7.4.bug.4",
  "jira_key": "PROJ-901",
  "jira_url": "https://x.atlassian.net/browse/PROJ-901",
  "parent_doc": "/abs/path/story.7.4.tap-targets.md",
  "parent_key": "PROJ-123",
  "link_outcome": "linked",
  "change_summary": "Initial Jira bug created",
  "reason": null,
  "record": null
}
```

`link_outcome` is one of `linked` · `already` · `no-link-type` · `deferred` · `no-parent-card` · `skipped` · `no-target` · `http-<status>`.

## Error Handling

| Error | Resolution |
| --- | --- |
| Filename matches no bug pattern | Warns, syncs with `mode: unknown` and no parent linkage. Rename the file to the documented pattern. |
| `related:` disagrees with the path | Warns; the path wins. Fix whichever is wrong. |
| Parent document not found | Warns; the card links to the bug report only. |
| Parent has no `jira_key` | Informational; document linked, card link deferred to a later re-sync. |
| No usable issue link type | `no-link-type`; description links only. |
| Jira rejects `JIRA_SEVERITY_FIELD` | Retries once without it, then proceeds. |
| Jira issue updated since last sync | Aborts; re-run with `--force` to overwrite. |
| `access.tracker` restricts the run | Create/update/link/transition recorded, not performed. No placeholder key is ever written. |

## Architecture

`scripts/sync-jira-bug.js` is a thin wrapper. The Jira client, ADF builders, link resolution, hashing, transitions and the deferral gate all live in the shared `jira-sync.js`; bug-document semantics live in `bug-doc.js`; the history table lives in `status-history.js`. All three are vendored into `references/` by `npm run bundle` — do not edit the copies.

## Tests

`tests/sync-jira-bug.test.js` and `tests/relative-doc-links.test.js`. Run with `npm test`.

## Notes

- Jira is a **read-only mirror** — edit the bug file and re-sync; do not edit the card.
- The bug lifecycle and the document lifecycle are separate vocabularies. Do not map one onto the other.
- For bulk re-sync, iterate over the find in Step 1 and invoke once per file.

---
name: sync-github-epic
description: Sync a local epic markdown file to GitHub Issues — creates the epic issue if it has no github_issue, updates it if github_issue is already set. Top-level work item (no parent); the epic's milestone (`Epic {P.E} — {title}`) carries the relationship to its stories/tasks. Adds the issue to the project board and mirrors the priority label onto the board's Priority field. Closes/reopens the issue based on frontmatter status. Writes a Change Log row on issue creation and on status transition only (not on body updates). GitHub-only sibling of sync-jira-epic. Use when the user says "create this epic in GitHub", "sync epic to GitHub", "push epic changes to GitHub", or "publish epic to GitHub".
---

# sync-github-epic

## Purpose

One-way sync of a local epic markdown file to GitHub Issues. Auto-detects create vs update from `github_issue` in frontmatter.

| `github_issue` present? | Action |
|---|---|
| Absent / null | **Pre-flight dedup search by title**, then **Create** (top-level epic issue, milestone auto-created) if no match. Writes `github_issue` back to file. |
| Present | **Update** existing GitHub issue (title, body, labels, milestone), reconcile open/closed state with frontmatter `status`. A Change Log row is written only if the status transitioned. |

**Difference from `sync-jira-epic`:** GitHub Issues are markdown-native, so no ADF translation; auth/retry/rate-limit are handled by the `gh` CLI; "status transitions" map to `gh issue close` / `gh issue reopen`, since GitHub only has `open`/`closed`. Labels carry the priority signal, and the epic milestone (`Epic {N} — {title}`) is the hierarchical anchor that child stories/tasks attach to — there is no GitHub equivalent of a Jira Epic-Name customfield.

**Difference from `sync-github-story`:** epics are **top-level** — no parent issue lookup, no sub-issue linking. The create path delegates to the `ensure-epic-github-issue` sub-routine (the same primitive `create-story`/`review-story` use), so an epic synced here and an epic auto-created during story work converge on one issue. Epics carry `estimated_sprints`, not `estimated_effort_hours`, so the board Estimate field is **not** mirrored.

## When to Use

- "Create this epic in GitHub"
- "Sync / push / update this epic to GitHub"
- "I've edited the epic, push changes to GitHub"
- "Publish this epic file to GitHub"

## When NOT to Use

- Project tracks via Jira → use `/sync-jira-epic`.
- Doc is a story or task → use `/sync-github-story` or `/sync-github-task`.

## Prerequisites

### Resolve paths

Source `references/resolve-paths.sh` to populate `${PRD_ROOT}` (default `docs/prd`). All path operations below use this env var.

### Required Files

- An epic markdown file at:
  `${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<name>/epic.<N>.<name>.md`
- `project.yml` at the repo root with:
  ```yaml
  github:
    owner: <github-org-or-user>
    repo: <repo-name>
    project_board_name: "<Project Board Display Name>"
    project_board_number: <integer>
  ```

### Required Tools

- `gh` CLI authenticated (`gh auth status` returns OK).
- The authenticated user must have write access to the repo and the project board.

## Workflow

### 1. Identify the Epic File

```
${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<slug>/epic.<N>.<slug>.md
```

To find epics that have **not yet been synced** (no `github_issue`):

```bash
grep -L 'github_issue:' $(find "$PRD_ROOT" -path '*/epics/*/epic.*.md' -not -path '*/stories/*')
```

### 2. Source the Platform Resolver and Confirm GitHub

```bash
source references/resolve-platform.sh || exit 1
# Expect TRACKER=github. If TRACKER=jira, abort and tell the user to run /sync-jira-epic.
```

### 3. Read Epic Frontmatter and Parse Identity

Extract from frontmatter: `title`, `status`, `priority`, `github_issue` (if present), `labels`, `prd_source` (repo-relative parent PRD path — every epic has one).

Read the epic id `P.E` from the filename with `references/doc-id.js` → `EPIC_ID`, and strip any leading
id prefix — `[Epic 3] `, `[Epic 1.3] `, `Epic 3: ` or `Epic 1.3: ` — from `title` to get the bare display
title `EPIC_TITLE`. The wrap below adds `[Epic P.E] ` once; stripping both forms makes a legacy title
converge and prevents a double prefix like `[Epic 1.3] Epic 3: …`. Run from the repository root:

```bash
# sync-github-epic — epic id and bare title (task 205)
# INPUTS: EPIC_FILE_PATH — the epic document. Id, title and milestone come from
# `doc-id.js epic-meta`, which reads that document: the one definition of the milestone key.
DOC_ID=.agents/skills/sync-github-epic/references/doc-id.js
: "${EPIC_FILE_PATH:?bind EPIC_FILE_PATH to the epic document}"
META=$(command node "$DOC_ID" epic-meta "$EPIC_FILE_PATH" --json) \
  || { echo "❌ $(printf '%s' "$META" | jq -r '.detail // .reason // "doc-id epic-meta failed"') — run /review-epic"; exit 1; }
EPIC_ID=$(printf '%s' "$META" | jq -r '.id')
EPIC_TITLE=$(printf '%s' "$META" | jq -r '.title')
MILESTONE_TITLE=$(printf '%s' "$META" | jq -r '.milestone')
```

Set `EPIC_RELATIVE_PATH` = the epic file path relative to the repo root.

The milestone title is always `Epic {EPIC_ID} — {EPIC_TITLE}` (em dash), matching `ensure-epic-github-issue`.

### 4. Branch: Create vs Update

#### 4a. Create Path (`github_issue` absent or null)

Invoke the `ensure-epic-github-issue` sub-routine with `EPIC_FILE_PATH={resolved epic file path}`. The sub-routine:

- checks for an existing `github_issue` (idempotent no-op if already set),
- reads `project.yml`,
- auto-creates the milestone `Epic {P.E} — {title}` if absent,
- creates the issue (`[Epic {P.E}] {title}`, label `epic`, milestone attached),
- adds it to the Project board,
- writes `github_issue: {N}` into the epic frontmatter.

On return, `EPIC_ISSUE_NUM` is set (integer) or empty — on failure **or when the
create was deferred** by a restricted `access.tracker`.

> **When `EPIC_ISSUE_NUM` is empty, stop here.** Skip the Priority mirror, the
> Change Log row and Step 5: each would assert a create that did not happen, and
> the board helper would be handed an empty issue number. Report the deferral
> instead; the handover checklist carries the action, and the second run converges
> once the key is in the frontmatter. This matters more for an epic than for a
> story or task — stories link to their epic by this number, so a false claim here
> mis-parents everything beneath it.

After the sub-routine returns (and only with a non-empty `EPIC_ISSUE_NUM`), mirror
the board's Priority field from frontmatter:

```bash
bash references/set-github-project-priority.sh "${EPIC_ISSUE_NUM}" "${priority}" || true
```

Append a Change Log row to the epic markdown:

```markdown
| YYYY-MM-DD HH:MM | Initial GitHub issue created (#{EPIC_ISSUE_NUM}) |
```

Continue to Step 5 (status reconciliation).

#### 4b. Update Path (`github_issue` present)

```bash
ISSUE_NUM={github_issue from frontmatter}
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# Resolve the Document-link branch the same way as on create: current branch's
# remote-tracking branch, falling back to the repo default branch, then `develop`.
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo develop)
DOC_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's|^[^/]*/||')
DOC_URL="https://github.com/$REPO/blob/${DOC_BRANCH:-$DEFAULT_BRANCH}/${EPIC_RELATIVE_PATH}"

# Resolve the parent PRD link the same way as the create path, so create→update stays
# diff-stable. Every epic has a parent PRD; PRD_LINE stays empty only when prd_source is
# missing, which /review-epic flags as Critical.
PRD_RELATIVE_PATH="${prd_source from frontmatter}"
PRD_LINE=""
if [ -n "$PRD_RELATIVE_PATH" ]; then
  PRD_URL="https://github.com/$REPO/blob/${DOC_BRANCH:-$DEFAULT_BRANCH}/${PRD_RELATIVE_PATH}"
  PRD_LINE=$'\n'"📋 [Parent PRD](${PRD_URL})"
fi

# Verify the issue still exists
gh issue view ${ISSUE_NUM} --json state,title,labels,body,milestone > /tmp/issue-${ISSUE_NUM}.json \
  || { echo "⚠️ GitHub issue #${ISSUE_NUM} not found — aborting update"; exit 1; }
```

Diff `title`, `body`, `labels`, `milestone` against current GitHub state. The body is rebuilt to the **same shape** `ensure-epic-github-issue` emits on create — Summary, Metadata (`Status`, `Priority`), and a `## Document` link block (using `DOC_URL` above, plus the `📋 [Parent PRD](…)` line from `${PRD_LINE}` when `prd_source` resolves) — so create→update is diff-stable. That shape and its caps are specified once, in [`references/tracker-card-summary.md`](./references/tracker-card-summary.md); follow it there rather than restating it here. Re-syncing from a feature branch refreshes the link to that branch (it changes the body, so the diff is non-empty and the edit runs). At acceptance, `finalise` re-points the link to the durable integration branch so the closed issue doesn't link to a deleted feature branch.

If anything changed, first resolve the milestone the edit attaches. **The epic's own milestone is
renamed in place, never created beside the old one**: when the epic was retitled, or its id moved
from `Epic 3` to `Epic 1.3`, creating the new title would move only this issue onto it and strand
every story still grouped on the old one. `--rename-from` renames the old milestone when the new
title does not exist yet, so its issues move with it.

**Only the epic's own milestone is renamed.** A current milestone counts as the epic's own when it
is `Epic {EPIC_ID} — …` (the epic was retitled) or `Epic {any id} — {EPIC_TITLE}` (its id moved).
Any other milestone — a sprint, a release, one shared with other work — is never renamed: the block
resolves or creates the epic's milestone as usual and the edit below moves only this issue onto it.

```bash
# sync-github-epic — resolve the epic's milestone, renaming in place (task 205)
# INPUTS: EPIC_FILE_PATH — the epic document. Everything else is derived HERE from it (each fenced
# block is its own shell, so nothing bound in Step 3 exists in this one; QA cycle 2, CR-3).
DOC_ID=.agents/skills/sync-github-epic/references/doc-id.js
: "${EPIC_FILE_PATH:?bind EPIC_FILE_PATH to the epic document}"
META=$(command node "$DOC_ID" epic-meta "$EPIC_FILE_PATH" --json) \
  || { echo "❌ $(printf '%s' "$META" | jq -r '.detail // .reason // "doc-id epic-meta failed"')"; exit 1; }
ISSUE_NUM=$(printf '%s' "$META" | jq -r '.githubIssue // empty')
EPIC_ID=$(printf '%s' "$META" | jq -r '.id')
EPIC_TITLE=$(printf '%s' "$META" | jq -r '.title')
MILESTONE_TITLE=$(printf '%s' "$META" | jq -r '.milestone')
[ -n "$ISSUE_NUM" ] || { echo "❌ ${EPIC_FILE_PATH} has no github_issue — this is the update path"; exit 1; }
ISSUE_JSON="/tmp/issue-${ISSUE_NUM}.json"
[ -s "$ISSUE_JSON" ] || { echo "❌ ${ISSUE_JSON} is missing — run the issue view above first"; exit 1; }
CURRENT_MILESTONE=$(jq -r '.milestone.title // empty' "$ISSUE_JSON")
RENAME_ARGS=()
if [ -n "$CURRENT_MILESTONE" ] && [ "$CURRENT_MILESTONE" != "$MILESTONE_TITLE" ]; then
  # Rename only the epic's OWN milestone: its id with any title (retitled), or its title under a
  # legacy one-number id (the id move task 205 introduces). A sprint, a shared milestone, or
  # another dotted epic's milestone with the same title is left alone (QA cycles 1–2, CR-1, CR-9).
  OWN_ID_PREFIX="Epic ${EPIC_ID} — "
  OWN_TITLE_SUFFIX=" — ${EPIC_TITLE}"
  case "$CURRENT_MILESTONE" in
    "$OWN_ID_PREFIX"*) RENAME_ARGS=(--rename-from "$CURRENT_MILESTONE") ;;
    Epic\ [0-9]*"$OWN_TITLE_SUFFIX")
      OLD_ID=${CURRENT_MILESTONE#Epic }; OLD_ID=${OLD_ID%"$OWN_TITLE_SUFFIX"}
      case "$OLD_ID" in *[!0-9]*|'') ;; *) RENAME_ARGS=(--rename-from "$CURRENT_MILESTONE") ;; esac ;;
  esac
fi
# Resolved from the repository root like doc-id above, and its failure is reported, not discarded:
# a rename that silently did not happen is the split this block exists to prevent (QA cycle 3, CR-5).
command node .agents/skills/sync-github-epic/references/tracker-issue.js \
  --kind milestone --title "${MILESTONE_TITLE}" "${RENAME_ARGS[@]}" --quiet \
  || echo "⚠️  milestone resolve/rename for ${MILESTONE_TITLE} did not complete — see the tracker-issue output above"
```

Then run the edit:

```bash
# The epic's id, title and milestone, derived in THIS block from the epic document (QA cycle 2, CR-3).
: "${EPIC_FILE_PATH:?bind EPIC_FILE_PATH to the epic document}"
META=$(command node .agents/skills/sync-github-epic/references/doc-id.js epic-meta "$EPIC_FILE_PATH" --json) || exit 1
ISSUE_NUM=$(printf '%s' "$META" | jq -r '.githubIssue // empty')
EPIC_ID=$(printf '%s' "$META" | jq -r '.id')
EPIC_TITLE=$(printf '%s' "$META" | jq -r '.title')
MILESTONE_TITLE=$(printf '%s' "$META" | jq -r '.milestone')
mkdir -p .claude/state
printf '%s' "$NEW_BODY" > .claude/state/issue-body.md

# A label the repository does not define fails the WHOLE edit; the shared
# helper drops it with a warning instead (task.125, TASK-125-BUG-3).
source .agents/skills/sync-github-epic/references/gh-labels.sh || exit 1
LABEL_ARGS=()
while IFS= read -r l; do [ -n "$l" ] && LABEL_ARGS+=(--add-label "$l"); done \
  < <(gh_labels_filter "priority:${priority}")
# The label to REMOVE is computed against the FILTERED new priority label (the
# line the helper emitted — the repository's case), never the frontmatter value:
# comparing `priority:High` to the issue's `priority:high` read as "different"
# and gh received add-then-remove of the same label, stripping it on every
# re-sync (TASK-125-BUG-10). Empty when nothing changes, so no --remove-label.
NEW_PRIORITY=$(printf '%s\n' "${LABEL_ARGS[@]}" | grep '^priority:' | head -1)
OLD_PRIORITY=$(gh issue view "${ISSUE_NUM}" --json labels -q '.labels[].name' 2>/dev/null \
  | grep '^priority:' | grep -vxF -- "${NEW_PRIORITY:-__none__}" | head -1)
REMOVE_ARGS=()
[ -n "$OLD_PRIORITY" ] && [ -n "$NEW_PRIORITY" ] && REMOVE_ARGS=(--remove-label "$OLD_PRIORITY")

node .agents/skills/sync-github-epic/references/tracker-issue.js --kind edit --issue ${ISSUE_NUM} \
  --title "[Epic ${EPIC_ID}] ${EPIC_TITLE}" \
  --body-file .claude/state/issue-body.md \
  --milestone "${MILESTONE_TITLE}" \
  "${LABEL_ARGS[@]}" \
  "${REMOVE_ARGS[@]}"
```

If the priority label changed, also re-mirror the board's Priority field:

```bash
bash references/set-github-project-priority.sh "${ISSUE_NUM}" "${priority}" || true
```

Append a Change Log row describing what changed:

```markdown
| YYYY-MM-DD HH:MM | Updated: title, body, milestone, priority |
```

Skip-when-no-diff: if title, body, labels, and milestone are all identical to the remote state, skip `gh issue edit`, write no Change Log row, and proceed to Step 5.

### 5. Status Reconciliation (open vs closed)

Map frontmatter `status` to GitHub state:

| Frontmatter status | GitHub state |
|---|---|
| `draft`, `planned`, `ready-for-development`, `in-progress`, `ready-for-review` | `open` |
| `accepted`, `done`, `complete`, `completed`, `cancelled` | `closed` |

```bash
DESIRED=open  # or closed, per the map above
CURRENT=$(gh issue view ${EPIC_ISSUE_NUM} --json state -q '.state' | tr '[:upper:]' '[:lower:]')

if [ "$CURRENT" != "$DESIRED" ]; then
  if [ "$DESIRED" = "closed" ]; then
    REASON=completed
    [ "$STATUS" = "cancelled" ] && REASON=not_planned
    node references/tracker-issue.js --kind close --issue ${EPIC_ISSUE_NUM} --reason ${REASON}
  else
    node references/tracker-issue.js --kind reopen --issue ${EPIC_ISSUE_NUM}
  fi
fi
```

### 6. Report to User

- ✅ GitHub issue number (e.g. `#7`)
- ✅ Issue URL
- ✅ Top-level epic (no parent issue)
- ✅ Milestone (e.g. `Epic 5 — Cache Refactor`) — child stories/tasks attach here
- ✅ Added to project board + Priority field mirrored
- ✅ State reconciled (`open` / `closed`)
- ✅ Change log entry appended (or `no-diff, skipped`)
- ✅ Epic frontmatter updated (on create only)
- 📌 Story reminder: child stories synced via `/sync-github-story` auto-link to this epic issue as sub-issues

## Change Log

The format is not restated here — it is defined once in
[document-change-log.md](references/document-change-log.md). Markers are
`<!-- change-log-start -->` / `<!-- change-log-end -->`; a document still carrying
the superseded `<!-- github-sync-changelog-* -->` pair is migrated in place on the
first sync that writes for another reason. A document synced to both trackers had
grown two blocks under two marker pairs; they collapse into one, rows preserved in
date order.

**A row is written for exactly two events:**

| Event | Row |
| --- | --- |
| Issue created | `\| 2026-08-12 \|  \| GitHub issue created (#204) \| sync-github-epic \|` |
| Status transition driven from frontmatter | `\| 2026-08-12 \|  \| Status → in-progress \| sync-github-epic \|` |

**A title, body, label or milestone update writes no row.** GitHub keeps its own
issue history with actor and timestamp, and the document records *why* the body
changed through its own review, develop and QA rows.

A sync that changes nothing writes nothing at all — no row, and no marker
migration. Migration rides along with a row write and must never be performed as a
standalone edit, or every sync rewrites every document.

## Frontmatter Fields Written

After sync the skill writes (in-place, preserving order):

```yaml
github_issue: 7
```

The full URL is reconstructable from `project.yml` (`owner` + `repo`) and the issue number, so no `github_url` field is persisted. Body cross-reference link and `github_issue` write-back are handled by `ensure-epic-github-issue` on the create path.

## Error Handling

| Error | Resolution |
|---|---|
| `TRACKER != github` | Abort with `Run /sync-jira-epic instead.` |
| `gh auth status` fails | Abort with instruction to run `gh auth login` |
| `project.yml` missing or malformed | Abort with diagnostic — show the field that failed to parse |
| Issue referenced by `github_issue` no longer exists | Abort update; user must reconcile manually (delete the stale `github_issue` and re-run for a fresh create) |
| `ensure-epic-github-issue` returns empty `EPIC_ISSUE_NUM` | Warn and continue — epic issue could not be created; re-run after resolving the underlying `gh` error |
| Milestone create/attach fails | Warn and continue — epic issue still created/updated without milestone |
| Project board add fails | Warn and continue |
| Priority field mirror fails | Warn and continue |

## Notes

- GitHub Issues is treated as a **read-only mirror** of the markdown — edit the epic file and re-sync; do not edit the issue directly. The skill does not detect or guard against concurrent remote edits (there is no Jira-style `updated` timestamp to anchor against).
- Status reconciliation is **lossy** going GitHub → markdown: `closed` only tells us the issue is done, not which terminal status (`accepted` vs `cancelled`) the epic is in. The frontmatter is authoritative; the skill never writes status back from GitHub.
- The epic-to-story hierarchy is expressed two ways on GitHub: the shared **milestone** groups all child issues, and `sync-github-story` additionally links each story as a **sub-issue** of this epic issue. Keep the epic issue number stable so those links survive.
- The skill assumes a one-to-one mapping between epic files and GitHub issues.
- For bulk re-sync: iterate over `find "$PRD_ROOT" -path '*/epics/*/epic.*.md' -not -path '*/stories/*'` and invoke the skill once per file.

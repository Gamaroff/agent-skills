---
name: sync-github-story
description: Sync a local story markdown file to GitHub Issues — creates the story issue if it has no github_issue, updates it if github_issue is already set. Links the story as a sub-issue of its parent epic (auto-resolves parent epic GitHub issue via ensure-epic-github-issue). Adds the issue to the project board and mirrors the priority label onto the board's Priority field. Closes/reopens the issue based on frontmatter status. Maintains a Change Log in the local story file. GitHub-only sibling of sync-jira-story. Use when the user says "create this story in GitHub", "sync story to GitHub", "push story changes to GitHub", or "publish story to GitHub".
---

# sync-github-story

## Purpose

One-way sync of a local story markdown file to GitHub Issues. Auto-detects create vs update from `github_issue` in frontmatter.

| `github_issue` present? | Action |
|---|---|
| Absent / null | **Pre-flight dedup search by title**, then **Create** (linked as sub-issue of parent epic) if no match. Writes `github_issue` back to file. |
| Present | **Update** existing GitHub issue (title, body, labels, milestone), reconcile open/closed state with frontmatter `status`, append Change Log row. |

**Difference from `sync-jira-story`:** GitHub Issues are markdown-native, so no ADF translation; auth/retry/rate-limit are handled by `gh` CLI; "status transitions" map to `gh issue close` / `gh issue reopen`, since GitHub only has `open`/`closed`. Labels carry the priority signal.

## When to Use

- "Create this story in GitHub"
- "Sync / push / update this story to GitHub"
- "I've edited the story, push changes to GitHub"
- "Publish this story file to GitHub"

## When NOT to Use

- Story already in Jira tracking workflow → use `/sync-jira-story`.
- Doc is an epic or task → use `/sync-github-epic` (if available) or `/sync-github-task`.

## Prerequisites

### Resolve paths

Source `references/resolve-paths.sh` to populate `${PRD_ROOT}` (default `docs/prd`). All path operations below use this env var.

### Required Files

- A story markdown file at:
  `${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<name>/stories/story.<N>.<M>.<slug>/story.<N>.<M>.<slug>.md`
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

### 1. Identify the Story File

```
${PRD_ROOT}/<domain>/<feature>/epics/epic.<N>.<slug>/stories/story.<N>.<M>.<slug>/story.<N>.<M>.<slug>.md
```

To find stories that have **not yet been synced** (no `github_issue`):

```bash
grep -L 'github_issue:' $(find "$PRD_ROOT" -path '*/stories/*/story.*.md')
```

### 2. Source the Platform Resolver and Confirm GitHub

```bash
source references/resolve-platform.sh
# Expect TRACKER=github. If TRACKER=jira, abort and tell the user to run /sync-jira-story.
```

### 3. Read Story Frontmatter and Parse Identity

Extract from frontmatter: `title`, `status`, `priority`, `github_issue` (if present), `labels`.

Parse the epic/story numbers from the filename: `story.{E}.{S}.` → `STORY_E`, `STORY_S`.

Derive the parent epic file path:

```bash
STORY_DIR=$(dirname "$STORY_FILE_PATH")
EPIC_DIR=$(dirname "$(dirname "$STORY_DIR")")
EPIC_FILE_PATH="${EPIC_DIR}/$(basename "$EPIC_DIR").md"
```

If `EPIC_FILE_PATH` does not exist, glob for `epic.*.md` in `${EPIC_DIR}`. If still not found, set `EPIC_ISSUE_NUM=""` and proceed — the story will be created without sub-issue linkage and a warning logged.

### 4. Ensure Parent Epic Has a GitHub Issue

Invoke the `ensure-epic-github-issue` sub-routine with `EPIC_FILE_PATH`. On return, `EPIC_ISSUE_NUM` is set (or empty on failure). Failure is non-blocking.

### 5. Branch: Create vs Update

#### 5a. Create Path (`github_issue` absent or null)

Invoke the `ensure-story-github-issue` sub-routine with:
- `STORY_FILE_PATH={resolved story file path}`
- `EPIC_ISSUE_NUM={value from Step 4}`

The sub-routine:
- runs a dedup-by-title search and adopts any single match,
- creates the issue if no match,
- adds it to the Project board, mirrors the Priority field,
- links it as a sub-issue of the parent epic (if `EPIC_ISSUE_NUM` non-empty),
- writes `github_issue: {N}` into the story frontmatter,
- inserts/repairs the body cross-reference row.

On return, `STORY_ISSUE_NUM` is set (integer) or empty (on failure).

Append a Change Log row to the story markdown:

```markdown
| YYYY-MM-DD HH:MM | Initial GitHub issue created (#{STORY_ISSUE_NUM}) |
```

Continue to Step 6 (status reconciliation).

#### 5b. Update Path (`github_issue` present)

```bash
ISSUE_NUM={github_issue from frontmatter}
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# Verify the issue still exists
gh issue view ${ISSUE_NUM} --json state,title,labels,body > /tmp/issue-${ISSUE_NUM}.json \
  || { echo "⚠️ GitHub issue #${ISSUE_NUM} not found — aborting update"; exit 1; }
```

Diff `title`, `body`, `labels` against current GitHub state. If anything changed, run:

```bash
gh issue edit ${ISSUE_NUM} \
  --title "[Story ${STORY_E}.${STORY_S}] ${STORY_TITLE}" \
  --body-file <(printf '%s' "$NEW_BODY") \
  --add-label "priority:${priority}" \
  --remove-label "$OLD_PRIORITY_LABEL_IF_DIFFERENT"
```

The body is rebuilt from the story document's `## User Story`, `## Acceptance Criteria`, `## Description` sections — same as the create path.

If the priority label changed, also re-mirror the board's Priority field:

```bash
bash references/set-github-project-priority.sh "${ISSUE_NUM}" "${priority}" || true
```

Append a Change Log row describing what changed:

```markdown
| YYYY-MM-DD HH:MM | Updated: title, body, priority |
```

Skip-when-no-diff: if title, body, and labels are all identical to the remote state, skip `gh issue edit`, skip the Change Log entry, and proceed to Step 6.

### 6. Status Reconciliation (open vs closed)

Map frontmatter `status` to GitHub state:

| Frontmatter status | GitHub state |
|---|---|
| `draft`, `planned`, `ready-for-development`, `in-progress`, `ready-for-review` | `open` |
| `accepted`, `done`, `complete`, `completed`, `cancelled` | `closed` |

```bash
DESIRED=open  # or closed, per the map above
CURRENT=$(gh issue view ${STORY_ISSUE_NUM} --json state -q '.state' | tr '[:upper:]' '[:lower:]')

if [ "$CURRENT" != "$DESIRED" ]; then
  if [ "$DESIRED" = "closed" ]; then
    REASON=completed
    [ "$STATUS" = "cancelled" ] && REASON=not_planned
    gh issue close ${STORY_ISSUE_NUM} --reason ${REASON}
  else
    gh issue reopen ${STORY_ISSUE_NUM}
  fi
fi
```

### 7. Report to User

- ✅ GitHub issue number (e.g. `#42`)
- ✅ Issue URL
- ✅ Parent epic linked (e.g. sub-issue of `#7`), or warning if no parent epic issue
- ✅ Added to project board + Priority field mirrored
- ✅ State reconciled (`open` / `closed`)
- ✅ Change log entry appended (or `no-diff, skipped`)
- ✅ Story frontmatter updated (on create only)

## Change Log Format

The Change Log lives in the story markdown body, wrapped in HTML markers so re-runs can find and append to it without duplicating the heading:

```markdown
<!-- github-sync-changelog-start -->
## Change Log

| Date (UTC)       | Change                              |
|------------------|-------------------------------------|
| 2026-05-12 09:40 | Initial GitHub issue created (#42)  |
| 2026-05-12 11:05 | Updated: title, body                |
<!-- github-sync-changelog-end -->
```

If the story already has a hand-written `## Change Log` heading without HTML markers, the first sync wraps it in markers in place and preserves any existing `| date | change |` rows.

## Frontmatter Fields Written

After sync the skill writes (in-place, preserving order):

```yaml
github_issue: 42
```

The full URL is reconstructable from `project.yml` (`owner` + `repo`) and the issue number, so no `github_url` field is persisted. Body cross-reference link (`| GitHub Issue | [#42](https://github.com/owner/repo/issues/42) |`) is added/repaired by `ensure-story-github-issue`.

## Error Handling

| Error | Resolution |
|---|---|
| `TRACKER != github` | Abort with `Run /sync-jira-story instead.` |
| `gh auth status` fails | Abort with instruction to run `gh auth login` |
| `project.yml` missing or malformed | Abort with diagnostic — show the field that failed to parse |
| Issue referenced by `github_issue` no longer exists | Abort update; user must reconcile manually (delete the stale `github_issue` and re-run for a fresh create) |
| `ensure-epic-github-issue` returns empty `EPIC_ISSUE_NUM` | Warn and continue — story issue is created without sub-issue linkage |
| Sub-issue linking API fails | Warn and continue — story issue is created but not hierarchically linked |
| Project board add fails | Warn and continue |
| Priority field mirror fails | Warn and continue |

## Notes

- GitHub Issues is treated as a **read-only mirror** of the markdown — edit the story file and re-sync; do not edit the issue directly. The skill does not detect or guard against concurrent remote edits (there is no Jira-style `updated` timestamp to anchor against).
- Status reconciliation is **lossy** going GitHub → markdown: `closed` only tells us the issue is done, not which terminal status (`accepted` vs `cancelled`) the story is in. The frontmatter is authoritative; the skill never writes status back from GitHub.
- The skill assumes a one-to-one mapping between story files and GitHub issues. If two stories somehow point at the same `github_issue`, both will edit the same issue in turn — clean up manually.
- For bulk re-sync: iterate over `find "$PRD_ROOT" -path '*/stories/*/story.*.md'` and invoke the skill once per file.

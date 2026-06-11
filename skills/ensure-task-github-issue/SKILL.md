---
name: ensure-task-github-issue
description: Internal sub-routine called from create-task and review-task. Given a task markdown file path, ensures the task has a corresponding GitHub issue. Creates the issue if missing, adds it to the project board, sets the board Priority field, and writes github_issue to the task frontmatter. Tasks are standalone (NOT linked to a parent epic issue) — milestone is resolved from frontmatter or epic-registry, defaulting to "Technical Tasks (standalone)". Returns TASK_ISSUE_NUM (integer or empty on failure). GitHub-only sibling of sync-jira-task. Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.
type: internal
---

# Ensure Task GitHub Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `create-task` and `review-task`. Do not invoke directly.

**Inputs (set by the calling skill before invoking):**

- `TASK_FILE_PATH` — repo-relative path to the task markdown file (e.g. `docs/tasks/task.5.cache-lib-refactor/task.5.cache-lib-refactor.md`)

**Output (set by this sub-routine, available to the calling skill):**

- `TASK_ISSUE_NUM` — the GitHub issue number for the task (integer string), or empty string on failure

---

## Steps

### Step T1: Read Task Frontmatter

1. Read the file at `TASK_FILE_PATH`.
2. Parse the YAML frontmatter block. Extract:
   - `github_issue` — current value (may be absent or null)
   - `title` — task title
   - `status` — task status
   - `priority` — task priority (lowercase; default `medium` if absent)
   - `milestone` — explicit milestone override (optional)
   - `epic` — parent epic number for milestone lookup (optional)
3. Parse the task id from the filename: pattern `task.{N}.` → `TASK_N`.
4. Strip any leading `Task {N}: ` prefix (or an already-bracketed `[Task {N}] ` prefix) from `title` to get the bare title for display: `TASK_TITLE`. (Stripping both forms prevents a double prefix like `[Task 5] Task 5: …`.)
5. Set `TASK_RELATIVE_PATH` = the path relative to the repo root.

### Step T2: Check if Task Issue Already Exists

If `github_issue` is a positive integer in the frontmatter:

- Set `TASK_ISSUE_NUM={github_issue value}`.
- **Return immediately** — nothing to do (idempotent).

If `github_issue` is absent, null, or empty:

- Continue to Step T3.

### Step T3: Resolve Milestone Title

Determine `MILESTONE_TITLE` in this order:

1. If `milestone` frontmatter field is set → use it verbatim.
2. Else if `epic` frontmatter field is set → look up `Epic {N}` in `docs/development/epic-registry.md` and use `"Epic {N} — {Epic Title}"`.
3. Else → default to `"Technical Tasks (standalone)"`.

If the chosen milestone does not yet exist on the repo, auto-create it (idempotent):

```bash
gh api repos/${OWNER}/${REPO_NAME}/milestones \
  -f title="${MILESTONE_TITLE}" \
  -f state="open" 2>/dev/null || true
```

### Step T4: Dedup Search — Look for Pre-Existing Task Issue

Before creating, search for an issue with a matching title:

```bash
DEDUP=$(gh issue list --search "in:title \"[Task ${TASK_N}]\"" --state all \
  --json number,url,state,title 2>/dev/null)
```

Behaviour:

- **Search failure** (non-zero exit) → log `⚠️ GitHub dedup search failed — proceeding to create` and continue to Step T5.
- **Exactly one match** → adopt it:
  - Extract `N` (issue number) and `url`.
  - Set `TASK_ISSUE_NUM=$N`.
  - If state is `CLOSED`: log `⚠️ Linked existing CLOSED task issue #${N} — verify intent before continuing.`
  - Log `Linked existing task issue #${N} (skipped create)`.
  - Skip to Step T7 (write frontmatter + body link).
- **Zero matches** → continue to Step T5.
- **Multiple matches** → log `⚠️ Dedup: {N} matches found for "[Task ${TASK_N}]": #n1, #n2, … — proceeding to create` and continue to Step T5.

### Step T5: Create the Task GitHub Issue

Read `project.yml` from the repo root:

```bash
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
OWNER=$(grep '^ *owner:' project.yml | head -1 | awk '{print $2}')
REPO_NAME=$(gh repo view --json name -q '.name')
PROJECT_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')
PROJECT_NAME=$(grep 'project_board_name:' project.yml | sed -E 's/.*: *"?([^"]+)"?/\1/')
# Prefer the current branch's remote-tracking branch (strip the remote prefix),
# so the link points at the branch where the work lives. Fall back to the repo's
# default branch when there is no upstream / HEAD is detached, then to `develop`.
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo develop)
DOC_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's|^[^/]*/||')
DOC_URL="https://github.com/$REPO/blob/${DOC_BRANCH:-$DEFAULT_BRANCH}/${TASK_RELATIVE_PATH}"
```

Create the task issue:

```bash
TASK_ISSUE_URL=$(gh issue create \
  --title "[Task ${TASK_N}] ${TASK_TITLE}" \
  --project "${PROJECT_NAME}" \
  --label "task" \
  --label "priority:${priority}" \
  --milestone "${MILESTONE_TITLE}" \
  --body "## Overview

{First paragraph of the task's Overview section — 2-4 sentences}

## Key Deliverables

{Bulleted list from the task's Key Deliverables or Scope section}

## Success Criteria (summary)

{2-5 most important criteria as a GitHub checkbox list}

## Metadata

| Field | Value |
|-------|-------|
| Priority | ${priority} |
| Effort | {estimated_effort_hours or —}h |
| Category | {category or —} |
| Depends on | {depends_on or —} |

## Document

📄 [Task Document](${DOC_URL})
📁 \`${TASK_RELATIVE_PATH}\`")

TASK_ISSUE_NUM=$(echo "$TASK_ISSUE_URL" | grep -oE '[0-9]+$')
```

**On failure** (`gh` exits non-zero or `TASK_ISSUE_NUM` is empty):

- Log: `⚠️ Failed to create GitHub issue for task — proceeding without task issue linkage`
- Set `TASK_ISSUE_NUM=""`
- **Return to the calling skill** — do NOT halt the calling skill.

### Step T6: Add to Project Board and Set Priority

```bash
gh project item-add ${PROJECT_NUM} --owner ${OWNER} --url "${TASK_ISSUE_URL}" 2>/dev/null || true
bash references/set-github-project-priority.sh "${TASK_ISSUE_NUM}" "${priority}" || true
bash references/set-github-project-estimate.sh "${TASK_ISSUE_NUM}" "${estimated_effort_hours}" || true
```

Both operations are non-blocking — log warnings on failure, continue.

Tasks are **standalone** — no sub-issue linking step. If a task happens to also have an `epic` frontmatter field, the milestone lookup in Step T3 covers the relationship; no separate sub-issue API call is made.

### Step T7: Write `github_issue` to Task Frontmatter and Insert Body Link

Write `github_issue: {TASK_ISSUE_NUM}` to the task file's YAML frontmatter:

- Locate the closing `---` of the frontmatter block.
- Append `github_issue: {TASK_ISSUE_NUM}` as the last field before the closing `---`.
- Do not modify anything outside the frontmatter block.

Add or repair the body cross-reference link (typically in the task header section):

```markdown
**GitHub Issue**: [#{TASK_ISSUE_NUM}](https://github.com/{OWNER}/{REPO_NAME}/issues/{TASK_ISSUE_NUM})
```

On frontmatter write failure: log `⚠️ Could not persist github_issue to task frontmatter — task issue #{TASK_ISSUE_NUM} was created but not written back` and continue.

### Step T8: Return to Calling Skill

`TASK_ISSUE_NUM` is now set and available to the calling skill.

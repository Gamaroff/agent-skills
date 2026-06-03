---
name: ensure-epic-github-issue
description: Internal sub-routine called from create-story and review-story. Given an epic markdown file path, ensures the epic has a corresponding GitHub issue. Creates the issue if missing, adds it to the project board, and writes github_issue to the epic frontmatter. Returns EPIC_ISSUE_NUM (integer or empty on failure). GitHub-only sibling of ensure-epic-jira-issue. Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.
type: internal
---

# Ensure Epic GitHub Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `create-story` and `review-story`. Do not invoke directly.

**Inputs (set by the calling skill before invoking):**
- `EPIC_FILE_PATH` — repo-relative path to the epic markdown file (e.g. `${PRD_ROOT}/service-domain/account/epics/epic.163.module-security/epic.163.module-security.md`; `${PRD_ROOT}` defaults to `docs/prd`)

**Output (set by this sub-routine, available to the calling skill):**
- `EPIC_ISSUE_NUM` — the GitHub issue number for the epic (integer string), or empty string on failure

---

## Steps

### Step E1: Read Epic Frontmatter

1. Read the file at `EPIC_FILE_PATH`.
2. Parse the YAML frontmatter block (between `---` delimiters). Extract:
   - `github_issue` — current value (may be absent or null)
   - `title` — epic title
   - `status` — epic status
   - `priority` — epic priority (use `—` if absent)
3. Parse the epic number from the filename: pattern `epic.{N}.` → `EPIC_N`.
4. Strip any leading `"Epic {N}: "` prefix from `title` to get the bare title for display: `EPIC_TITLE`.
5. Set `EPIC_RELATIVE_PATH` = the path relative to the repo root.

### Step E2: Check if Epic Issue Already Exists

If `github_issue` is a positive integer in the frontmatter:
- Set `EPIC_ISSUE_NUM={github_issue value}`.
- **Return immediately** — nothing to do (idempotent).

If `github_issue` is absent, null, or empty:
- Continue to Step E3.

### Step E3: Create the Epic GitHub Issue

Read `project.yml` from the repo root:

```bash
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
OWNER=$(grep '^ *owner:' project.yml | head -1 | awk '{print $2}')
PROJECT_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')
MILESTONE_TITLE="Epic ${EPIC_N} — ${EPIC_TITLE}"
# Prefer the current branch's remote-tracking branch (strip the remote prefix),
# so the link points at the branch where the work lives. Fall back to the repo's
# default branch when there is no upstream / HEAD is detached, then to `develop`.
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo develop)
DOC_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's|^[^/]*/||')
DOC_URL="https://github.com/$REPO/blob/${DOC_BRANCH:-$DEFAULT_BRANCH}/${EPIC_RELATIVE_PATH}"
```

Auto-create the milestone if it doesn't exist yet:

```bash
gh api repos/${OWNER}/$(gh repo view --json name -q '.name')/milestones \
  -f title="${MILESTONE_TITLE}" \
  -f state="open" 2>/dev/null || true
```

Create the epic issue:

```bash
EPIC_ISSUE_URL=$(gh issue create \
  --title "[Epic ${EPIC_N}] ${EPIC_TITLE}" \
  --label "epic" \
  --milestone "${MILESTONE_TITLE}" \
  --body "## Overview

{first paragraph of the epic description — the text immediately after the first ## heading or the opening paragraph}

## Metadata

| Field | Value |
|-------|-------|
| Status | ${EPIC_STATUS} |
| Priority | ${EPIC_PRIORITY} |

## Document

📄 [Epic Document](${DOC_URL})
📁 \`${EPIC_RELATIVE_PATH}\`")

EPIC_ISSUE_NUM=$(echo "$EPIC_ISSUE_URL" | grep -oE '[0-9]+$')
```

**On failure** (`gh` exits non-zero or `EPIC_ISSUE_NUM` is empty):
- Log: `⚠️ Failed to create GitHub issue for epic — proceeding without epic issue linkage`
- Set `EPIC_ISSUE_NUM=""`
- **Return to the calling skill** — do NOT halt the calling skill.

### Step E4: Add to Project Board and Update Epic Frontmatter

Add the epic issue to the GitHub Project board:

```bash
gh project item-add ${PROJECT_NUM} --owner ${OWNER} --url "${EPIC_ISSUE_URL}" 2>/dev/null || true
```

Failure here is non-blocking — log a warning and continue.

Write `github_issue: {EPIC_ISSUE_NUM}` to the epic file's YAML frontmatter:
- Locate the closing `---` of the frontmatter block.
- Append `github_issue: {EPIC_ISSUE_NUM}` as the last field before the closing `---`.
- Do not modify anything outside the frontmatter block.

On frontmatter write failure: log `⚠️ Could not persist github_issue to epic frontmatter — epic issue #{EPIC_ISSUE_NUM} was created but not written back` and continue.

### Step E5: Return to Calling Skill

`EPIC_ISSUE_NUM` is now set and available to the calling skill.

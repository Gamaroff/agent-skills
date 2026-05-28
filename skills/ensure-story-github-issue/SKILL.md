---
name: ensure-story-github-issue
description: Internal sub-routine called from create-story and review-story. Given a story markdown file path and (optionally) a parent epic GitHub issue number, ensures the story has a corresponding GitHub issue. Creates the issue if missing, adds it to the project board, links it as a sub-issue of the parent epic, sets the board Priority field, and writes github_issue to the story frontmatter. Returns STORY_ISSUE_NUM (integer or empty on failure). GitHub-only sibling of sync-jira-story (which handles the Jira path). Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.
type: internal
---

# Ensure Story GitHub Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `create-story` and `review-story`. Do not invoke directly.

**Inputs (set by the calling skill before invoking):**
- `STORY_FILE_PATH` — repo-relative path to the story markdown file (e.g. `${PRD_ROOT}/onboarding/epics/epic.1.first-task-in-10-minutes/stories/story.1.1.first-task-in-10-minutes/story.1.1.first-task-in-10-minutes.md`; `${PRD_ROOT}` defaults to `docs/prd`)
- `EPIC_ISSUE_NUM` — parent epic GitHub issue number (integer string, or empty if no parent epic issue exists)

**Output (set by this sub-routine, available to the calling skill):**
- `STORY_ISSUE_NUM` — the GitHub issue number for the story (integer string), or empty string on failure

---

## Steps

### Step S1: Read Story Frontmatter

1. Read the file at `STORY_FILE_PATH`.
2. Parse the YAML frontmatter block (between `---` delimiters). Extract:
   - `github_issue` — current value (may be absent or null)
   - `title` — story title
   - `status` — story status
   - `priority` — story priority (lowercase; default `medium` if absent)
   - `estimated_effort_hours` — story effort estimate in hours (number; absent/empty if not set)
3. Parse the epic and story numbers from the filename: pattern `story.{E}.{S}.` → `STORY_E`, `STORY_S`.
4. Strip any leading `"Story {E}.{S}: "` prefix from `title` to get the bare title for display: `STORY_TITLE`.
5. Set `STORY_RELATIVE_PATH` = the path relative to the repo root.
6. Derive the parent epic title from the grandparent directory. `EPIC_DIR=$(dirname "$(dirname "$(dirname "$STORY_FILE_PATH")")")`. Read `${EPIC_DIR}/$(basename "$EPIC_DIR").md` and pull `title` from its frontmatter. Strip the `"Epic {E}: "` prefix → `EPIC_TITLE`. On failure, set `EPIC_TITLE=""`.

### Step S2: Check if Story Issue Already Exists

If `github_issue` is a positive integer in the frontmatter:
- Set `STORY_ISSUE_NUM={github_issue value}`.
- **Return immediately** — nothing to do (idempotent).

If `github_issue` is absent, null, or empty:
- Continue to Step S3.

### Step S3: Dedup Search — Look for Pre-Existing Story Issue

Before creating, search for an issue with a matching title:

```bash
DEDUP=$(gh issue list --search "in:title \"[Story ${STORY_E}.${STORY_S}]\"" --state all \
  --json number,url,state,title 2>/dev/null)
```

Behaviour:
- **Search failure** (non-zero exit) → log `⚠️ GitHub dedup search failed — proceeding to create` and continue to Step S4.
- **Exactly one match** → adopt it:
  - Extract `N` (issue number) and `url`.
  - Set `STORY_ISSUE_NUM=$N`.
  - If state is `CLOSED`: log `⚠️ Linked existing CLOSED story issue #${N} — verify intent before continuing.`
  - Log `Linked existing story issue #${N} (skipped create)`.
  - Skip to Step S6 (write frontmatter + body link). Do **not** re-link as sub-issue (existing issue is assumed already linked to its parent epic).
- **Zero matches** → continue to Step S4.
- **Multiple matches** → log `⚠️ Dedup: {N} matches found for "[Story ${STORY_E}.${STORY_S}]": #n1, #n2, … — proceeding to create` and continue to Step S4.

### Step S4: Create the Story GitHub Issue

Read `project.yml` from the repo root:

```bash
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
OWNER=$(grep '^ *owner:' project.yml | head -1 | awk '{print $2}')
PROJECT_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')
PROJECT_NAME=$(grep 'project_board_name:' project.yml | sed -E 's/.*: *"?([^"]+)"?/\1/')
MILESTONE_TITLE="Epic ${STORY_E} — ${EPIC_TITLE}"
DOC_URL="https://github.com/$REPO/blob/develop/${STORY_RELATIVE_PATH}"
```

Auto-create the milestone if it doesn't exist yet:

```bash
gh api repos/${OWNER}/$(gh repo view --json name -q '.name')/milestones \
  -f title="${MILESTONE_TITLE}" \
  -f state="open" 2>/dev/null || true
```

Create the story issue:

```bash
STORY_ISSUE_URL=$(gh issue create \
  --title "[Story ${STORY_E}.${STORY_S}] ${STORY_TITLE}" \
  --project "${PROJECT_NAME}" \
  --label "story" \
  --label "priority:${priority}" \
  --milestone "${MILESTONE_TITLE}" \
  --body "## Overview

{First 2-4 sentences from the story's User Story / purpose / description}

## Acceptance Criteria

{Acceptance criteria formatted as a GitHub checkbox list}

## Metadata

| Field | Value |
|-------|-------|
| Priority | ${priority} |
| Effort | ${estimated_effort_hours:-—}h |

## Document

📄 [Story Document](${DOC_URL})
📁 \`${STORY_RELATIVE_PATH}\`")

STORY_ISSUE_NUM=$(echo "$STORY_ISSUE_URL" | grep -oE '[0-9]+$')
```

**On failure** (`gh` exits non-zero or `STORY_ISSUE_NUM` is empty):
- Log: `⚠️ Failed to create GitHub issue for story — proceeding without story issue linkage`
- Set `STORY_ISSUE_NUM=""`
- **Return to the calling skill** — do NOT halt the calling skill.

### Step S5: Add to Project Board, Set Priority, Link as Sub-Issue

**Add to GitHub Project board:**

```bash
gh project item-add ${PROJECT_NUM} --owner ${OWNER} --url "${STORY_ISSUE_URL}" 2>/dev/null || true
```

**Mirror the priority label onto the board's Priority single-select field:**

```bash
bash references/set-github-project-priority.sh "${STORY_ISSUE_NUM}" "${priority}" || true
```

**Mirror the estimate onto the board's Estimate number field** (no-op if frontmatter has no estimate):

```bash
bash references/set-github-project-estimate.sh "${STORY_ISSUE_NUM}" "${estimated_effort_hours}" || true
```

**Link story as sub-issue of parent epic** (only if `EPIC_ISSUE_NUM` is non-empty):

The GitHub sub-issues API requires the **internal database id** of the child issue, not its visible issue number. It must be passed as a typed integer (`-F`), not a string (`-f`):

```bash
if [ -n "${EPIC_ISSUE_NUM}" ]; then
  REPO_NAME=$(gh repo view --json name -q '.name')
  SUB_ID=$(gh api /repos/${OWNER}/${REPO_NAME}/issues/${STORY_ISSUE_NUM} --jq .id 2>/dev/null)
  if [ -n "$SUB_ID" ]; then
    gh api \
      --method POST \
      -H "Accept: application/vnd.github+json" \
      /repos/${OWNER}/${REPO_NAME}/issues/${EPIC_ISSUE_NUM}/sub_issues \
      -F sub_issue_id="$SUB_ID" 2>/dev/null \
      && echo "✅ Story #${STORY_ISSUE_NUM} linked as sub-issue of Epic #${EPIC_ISSUE_NUM}." \
      || echo "⚠️ Sub-issue linking failed — story issue created but not hierarchically linked."
  fi
fi
```

All three operations are non-blocking — log warnings on failure, continue.

### Step S6: Write `github_issue` to Story Frontmatter and Insert Body Link

Write `github_issue: {STORY_ISSUE_NUM}` to the story file's YAML frontmatter:
- Locate the closing `---` of the frontmatter block.
- Append `github_issue: {STORY_ISSUE_NUM}` as the last field before the closing `---`.
- Do not modify anything outside the frontmatter block.

Add or repair the body cross-reference link in the Story Information table (or under the first heading if no such table exists):

```markdown
| GitHub Issue | [#{STORY_ISSUE_NUM}](https://github.com/{OWNER}/{REPO_NAME}/issues/{STORY_ISSUE_NUM}) |
```

On frontmatter write failure: log `⚠️ Could not persist github_issue to story frontmatter — story issue #{STORY_ISSUE_NUM} was created but not written back` and continue.

### Step S7: Return to Calling Skill

`STORY_ISSUE_NUM` is now set and available to the calling skill.

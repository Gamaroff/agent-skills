---
name: develop-pipeline-step-0-resolve-and-prepare
description: Phase 0 (resolve-and-prepare) shared by develop-story and develop-task. Covers Steps 0a–0f: file/issue resolution, pipeline state check, upfront context reading, tracker signal, upfront Q&A, implementation report creation, and pre-flight summary. Story vs task variants are called out in each sub-section where they differ.
---

# Develop Pipeline — Phase 0: Resolve & Prepare

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Phase 0. Where story and task variants differ, each sub-section is split into `#### develop-story` and `#### develop-task` sub-sections. Where content is identical, it is written once.

---

## 0a. Resolve the Document File

#### develop-story

Accept any of:
- **Story file**: `docs/stories/story.8.2.configure-validation-pipe/story.8.2.configure-validation-pipe.md`
- **Story directory**: `docs/stories/story.8.2.configure-validation-pipe/`
- **Bare filename**: `story.8.2.configure-validation-pipe.md`
- **GitHub issue URL** (direct or project board): `https://github.com/.../issues/297` or URL containing `issue=`
- **Issue hash notation**: `#297`
- **Bare issue number**: `297`

Jira key inline resolution: search `LOCAL_PATH=$(grep -rl "jira_key: ${JIRA_KEY}" docs/ 2>/dev/null | grep -v '\.implementation\.' | grep -v '\.review\.' | grep -v '\.gate\.' | head -1)`. Not found → HALT: "No local document found for Jira issue ${JIRA_KEY}. Run `/create-story` first to link it, or provide the file path directly."

GitHub issue inline resolution: extract `ISSUE_NUM`, fetch body, parse `DOC_URL`. Not found → fall back to `grep -rl "github_issue: {N}" docs/`. Still not found → HALT: "No local document found for issue #{N}. Run `/create-story` first, or provide the file path directly."

Explore subagent (file/directory/bare-filename inputs): find file matching `story.{epic}.{story}.*.md` that does NOT contain `.qa.`, `.gate.`, `.bug.`, or `.implementation.` in its name. Return absolute file path and story directory path.

Extract `{epic_number}` and `{story_number}` from the pattern `story.{epic}.{story}.{name}.md`.

**Epic branch resolution** — immediately after extracting epic_number/story_number:

```bash
EPIC_REF=$(grep '^epic:' {story-file} | awk '{print $2}')
```

If `EPIC_REF` is empty or missing: **HALT** — "Story must have an `epic:` frontmatter field referencing a parent epic (e.g. `epic: epic.178.feature-ui`). Add the field and re-run."

```bash
EPIC_NUM=$(echo "$EPIC_REF" | grep -oE '[0-9]+' | head -1)
EPIC_SLUG=$(echo "$EPIC_REF" | sed 's/epic\.[0-9]*\.//')
EPIC_BRANCH="feature/epic.${EPIC_NUM}.${EPIC_SLUG}"
```

Locate the epic file (required):
```bash
EPIC_FILE=$(find docs/ -name "epic.${EPIC_NUM}.*.md" 2>/dev/null \
  | grep -v '\.review\.' | grep -v '\.gate\.' | grep -v '\.implementation\.' | head -1)
```

If `EPIC_FILE` is empty: **HALT** — "Epic file `epic.{EPIC_NUM}.*` not found in `docs/`. Ensure the epic document exists before running develop-story."

Store `EPIC_NUM`, `EPIC_SLUG`, `EPIC_BRANCH`, and `EPIC_FILE` as pipeline-wide variables.

#### develop-task

Accept any of:
- **Task file**: `docs/development/tasks/task.2.home-page-content-realignment/task.2.home-page-content-realignment.md`
- **Task directory**: `docs/development/tasks/task.2.home-page-content-realignment/`
- **Bare filename**: `task.2.home-page-content-realignment.md`
- **GitHub issue URL** (direct or project board): `https://github.com/.../issues/297` or URL containing `issue=`
- **Issue hash notation**: `#297`
- **Bare issue number**: `297`

Jira key inline resolution: search `LOCAL_PATH=$(grep -rl "jira_key: ${JIRA_KEY}" docs/ 2>/dev/null | grep -v '\.implementation\.' | grep -v '\.review\.' | grep -v '\.gate\.' | head -1)`. Not found → HALT: "No local document found for Jira issue ${JIRA_KEY}. Run `/create-task` first to link it, or provide the file path directly."

GitHub issue inline resolution: extract `ISSUE_NUM`, fetch body, parse `DOC_URL`. Not found → fall back to `grep -rl "github_issue: {N}" docs/`. Still not found → HALT: "No local document found for issue #{N}. Run `/create-task` first, or provide the file path directly."

Explore subagent (file/directory/bare-filename inputs): find file matching `task.{id}.*.md` that does NOT contain `.qa.`, `.gate.`, `.bug.`, or `.implementation.` in its name. Return absolute file path and task directory path.

Extract `{task_id}` from the pattern `task.{id}.{name}.md`.

### Inline Resolution — Shared Logic

**Jira URL / issue key** (when `JIRA_URL` is set):
```bash
JIRA_KEY=$(echo "$INPUT" | grep -oE '[A-Z]+-[0-9]+' | tail -1)
```

**GitHub URL / issue number** (when `JIRA_URL` is NOT set):
```bash
# Direct issue URL:
ISSUE_NUM=$(echo "$INPUT" | grep -oE '(?<=/issues/)[0-9]+')
# Project board URL / hash notation / bare number — generic fallback:
[ -z "$ISSUE_NUM" ] && ISSUE_NUM=$(echo "$INPUT" | grep -oE '[0-9]+' | tail -1)

ISSUE_BODY=$(gh issue view {N} --json body -q '.body')
DOC_URL=$(echo "$ISSUE_BODY" | grep -o 'https://github\.com/[^)]*\.md' | head -1)
LOCAL_PATH=$(echo "$DOC_URL" | sed 's|https://github\.com/[^/]*/[^/]*/blob/[^/]*/||')
```

If the Explore subagent cannot find the file, HALT and ask the user to confirm the path.

---

## 0b. Check Pipeline State — Resume or Restart?

Before asking any questions, check whether a previous run was started:

#### develop-story
```bash
git branch --list "feature/story.{epic}.{story}.*"
gh pr list --head "feature/story.{epic}.{story}.*" --json number,url,state 2>/dev/null
ls {story-directory}/story.{epic}.{story}.implementation.*.md 2>/dev/null
```

**If a previous run is detected**: ask "A previous pipeline run exists for this story. What would you like to do?" Options: "Resume from last completed step" (Recommended) / "Start fresh".

Also detect whether the epic branch already exists:

```bash
EPIC_BRANCH_LOCAL=$(git branch --list "feature/epic.${EPIC_NUM}.*" | tr -d ' *')
EPIC_BRANCH_REMOTE=$(git ls-remote --heads origin "feature/epic.${EPIC_NUM}.*" 2>/dev/null \
  | awk '{print $2}' | sed 's|refs/heads/||')
if [ -n "$EPIC_BRANCH_LOCAL" ] || [ -n "$EPIC_BRANCH_REMOTE" ]; then
  EPIC_BRANCH_EXISTS=true
else
  EPIC_BRANCH_EXISTS=false
fi
```

Store `EPIC_BRANCH_EXISTS` as a pipeline-wide variable.

#### develop-task
```bash
git branch --list "feature/task.{id}.*"
gh pr list --head "feature/task.{id}.*" --json number,url,state 2>/dev/null
ls {task-directory}/task.{id}.implementation.*.md 2>/dev/null
```

**If a previous run is detected**: ask "A previous pipeline run exists for this task. What would you like to do?" Options: "Resume from last completed step" (Recommended) / "Start fresh".

### Shared Resume Logic

If resuming: read the existing implementation report, identify the last ✅ step, and verify each completed step's artifact before skipping it. Skip upfront questions already recorded in the Decisions Log.

**Resume artifact verification**: see `shared/resources/develop-pipeline-resume-contract.md` for the full contract — per-step verification table, plan freshness check, gate file conflation warning, QA cycle count reconstruction, branch/PR cross-check, and MAX_ITER=5 stall semantics.

If starting fresh: continue to 0c.

---

## 0c. Read Document for Upfront Context

Before asking questions, read the document file and note the title (for implementation report naming), `Status:` field, `risk_level:` field, and tracker issue.

**Tracker detection (identical for both orchestrators):**

```bash
if [ -n "$JIRA_URL" ]; then
  TRACKER="jira"
  TRACKER_ISSUE=$(grep '^jira_key:' {document-file} | awk '{print $2}')
  if [ -z "$TRACKER_ISSUE" ] || [ "$TRACKER_ISSUE" = "null" ]; then
    echo "⚠️ No Jira issue linked (jira_key absent or null) — tracker references will be skipped"
    TRACKER_ISSUE=""
  fi
else
  TRACKER="github"
  TRACKER_ISSUE=$(grep '^github_issue:' {document-file} | awk '{print $2}')
  GITHUB_ISSUE="$TRACKER_ISSUE"   # kept for backward compatibility with sub-skills
  if [ -z "$TRACKER_ISSUE" ] || [ "$TRACKER_ISSUE" = "null" ]; then
    echo "No GitHub Issue linked — issue references will be skipped"
    TRACKER_ISSUE=""
    GITHUB_ISSUE=""
  fi
fi
```

`TRACKER` and `TRACKER_ISSUE` are pipeline-wide variables — every subsequent branch uses them.

**Autonomous status handling:**

#### develop-story

| Status | Action |
|--------|--------|
| `Ready for Development` | Proceed normally |
| `In Progress` | Proceed normally |
| `Draft` | Note in the implementation report. Proceed — Step 2 (`/review-story`) will validate and update the status autonomously. Do NOT ask the user. |
| `Ready for Review` / `accepted` | HALT — story is already past development. Ask the user if they want to re-run or check the wrong story path. |
| Any other status | HALT — status is unexpected. Report to user before proceeding. |

#### develop-task

| Status | Action |
|--------|--------|
| `Planned` | Note in the implementation report. Proceed — Step 2 (`/review-task`) will validate and update the status autonomously. Do NOT ask the user. |
| `Ready for Development` | Proceed normally |
| `In Progress` | Proceed normally |
| `Ready for Review` / `accepted` | HALT — task is already past development. Ask the user if they want to re-run or check the wrong task path. |
| `Cancelled` | HALT — task is cancelled. Report to user before proceeding. |
| Any other status | HALT — status is unexpected. Report to user before proceeding. |

**Note (tasks only)**: if no `jira_key` is present (tasks are often purely technical), silently skip all Jira operations.

**Lite mode detection**: see `shared/resources/develop-pipeline-lite-mode.md` for trigger conditions, `PIPELINE_MODE=lite` behaviour, and the directive format passed to the QA skill.

---

## 0c-reg. Signal Work Started

If `TRACKER_ISSUE` is set (extracted in Phase 0c), signal that work has started on the linked tracker issue. Branch on `TRACKER`. **This section is identical for develop-story and develop-task.**

### Jira path (when `TRACKER=jira`):

Use the Atlassian MCP tools — no auth management needed. Derive `cloudId` from `JIRA_URL` by extracting the hostname (e.g. `yourorg.atlassian.net` from `https://yourorg.atlassian.net`). If a tool call fails with a cloud resolution error, call `getAccessibleAtlassianResources` and use the `id` field from the matching entry.

1. **Post pipeline-start comment** — call `addCommentToJiraIssue`:
   - `cloudId`: {derived hostname}
   - `issueIdOrKey`: `{TRACKER_ISSUE}`
   - `commentBody`: `"Pipeline started — branch: \`{branch-name}\`"`
   - `contentFormat`: `"markdown"`
   - On failure: log warning and continue (non-blocking)

2. **Transition to "In Progress"** — call `getTransitionsForJiraIssue` then `transitionJiraIssue`:
   - Call `getTransitionsForJiraIssue` with `cloudId` and `issueIdOrKey: {TRACKER_ISSUE}`
   - Find the transition whose `name` matches "In Progress" (case-insensitive)
   - If found: call `transitionJiraIssue` with `cloudId`, `issueIdOrKey: {TRACKER_ISSUE}`, and `transition: {id: "<matched-id>"}`
   - If no matching transition: log "⚠️ No 'In Progress' transition available for {TRACKER_ISSUE}" and skip
   - On failure: log warning and continue (non-blocking)

3. **Post-condition verification** — call `getJiraIssue` to confirm the transition worked:
   - Call `getJiraIssue` with `cloudId`, `issueIdOrKey: {TRACKER_ISSUE}`, `fields: ["status"]`
   - Check `fields.status.name`: if "In Progress" → log "✅ Jira issue {TRACKER_ISSUE} confirmed In Progress"
   - If NOT "In Progress": retry step 2 once; if still not moved, log "⚠️ Jira status not updated — proceeding" in Issues Log

All steps are **non-blocking** — failures are logged but do not halt the pipeline.

Add to the implementation report Pipeline Configuration table:

| Tracker Issue | {TRACKER_ISSUE} (Jira) or not linked |
| Tracker status | In Progress ✅ / ⚠️ transition failed |

### GitHub path (when `TRACKER=github`):

```bash
# 1. Post pipeline-start comment
gh issue comment {TRACKER_ISSUE} --body "Pipeline started — branch: \`{branch-name}\`"

# 2. Move issue to "In Progress" on the Projects board (graceful — warn and continue on any failure)
(
  OWNER=$(gh repo view --json owner -q '.owner.login')
  REPO_NAME=$(gh repo view --json name -q '.name')
  REPO_URL=$(gh repo view --json url -q '.url')
  BOARD_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')

  # Ensure issue is on the board (idempotent — returns existing item if already present)
  gh project item-add "$BOARD_NUM" --owner "$OWNER" --url "$REPO_URL/issues/{TRACKER_ISSUE}" 2>/dev/null || true

  # Query the issue directly for its project items — avoids item-list pagination limits
  RESPONSE=$(gh api graphql -f query='
  {
    repository(owner: "'"$OWNER"'", name: "'"$REPO_NAME"'") {
      issue(number: {TRACKER_ISSUE}) {
        projectItems(first: 10) {
          nodes {
            id
            fieldValueByName(name: "Priority") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            project {
              id
              title
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options { id name }
                  }
                }
              }
            }
          }
        }
      }
    }
  }')

  # Extract IDs from the first project item
  ITEM_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].id // empty')
  PROJECT_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.id // empty')
  STATUS_FIELD_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Status") | .id // empty')
  OPTION_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Status") | .options[] | select(.name == "In Progress") | .id // empty')

  # Extract Priority field details (for auto-set when unset)
  PRIORITY_FIELD_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Priority") | .id // empty')
  CURRENT_PRIORITY=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].fieldValueByName.name // empty')
  P2_OPTION_ID=$(echo "$RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Priority") | .options[] | select(.name | startswith("P2")) | .id // empty')

  if [ -z "$ITEM_ID" ] || [ -z "$PROJECT_ID" ] || [ -z "$STATUS_FIELD_ID" ] || [ -z "$OPTION_ID" ]; then
    echo "⚠️  Could not resolve project item or Status field — skipping board update"
  else
    gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: "'"$PROJECT_ID"'"
          itemId: "'"$ITEM_ID"'"
          fieldId: "'"$STATUS_FIELD_ID"'"
          value: { singleSelectOptionId: "'"$OPTION_ID"'" }
        }
      ) {
        projectV2Item { id }
      }
    }' \
      && echo "✅ Issue #{TRACKER_ISSUE} moved to In Progress on Projects board" \
      || echo "⚠️  Board status update failed — issue comment was posted successfully"

    # Set Priority to P2 – Medium if the field exists and is currently unset
    if [ -n "$PRIORITY_FIELD_ID" ] && [ -n "$P2_OPTION_ID" ] && [ -z "$CURRENT_PRIORITY" ]; then
      gh api graphql -f query='
      mutation {
        updateProjectV2ItemFieldValue(input: {
          projectId: "'"$PROJECT_ID"'"
          itemId: "'"$ITEM_ID"'"
          fieldId: "'"$PRIORITY_FIELD_ID"'"
          value: { singleSelectOptionId: "'"$P2_OPTION_ID"'" }
        }) { projectV2Item { id } }
      }' >/dev/null 2>&1 \
        && echo "✅ Priority set to P2 – Medium (was unset)" \
        || echo "⚠️  Priority field update failed — continuing"
    fi
  fi
) || echo "⚠️  Projects board update skipped (gh project unavailable or auth scope missing)"
```

**Post-condition check** — immediately after the block above, verify the board actually moved:

```bash
BOARD_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')
BOARD_STATUS=$(gh project item-list "$BOARD_NUM" --owner "$(gh repo view --json owner -q '.owner.login')" --format json 2>/dev/null \
  | jq -r '.items[] | select(.content.number == {TRACKER_ISSUE}) | .status // "unknown"')
if [ "$BOARD_STATUS" = "Todo" ] || [ "$BOARD_STATUS" = "unknown" ]; then
  echo "⚠️  POST-CONDITION FAILED: Issue #{TRACKER_ISSUE} is still '$BOARD_STATUS' on the board — board update did not take effect"
else
  echo "✅ Post-condition verified: board status is '$BOARD_STATUS'"
fi
```

If the post-condition warns, retry the board update once. If it still fails, log the warning in the implementation report Issues Log and continue — do not block the pipeline.

Add to the implementation report Pipeline Configuration table:

| Tracker Issue | #{TRACKER_ISSUE} (GitHub) or not linked |
| Board status | In Progress ✅ / ⚠️ update failed |

If `TRACKER_ISSUE` is not set, skip this entire section — do NOT update the deprecated register (`docs/development/todo-list.md`).

---

## 0d. Upfront Setup — Gather All Decisions Before Execution

Check the current branch:
```bash
git branch --show-current
```

Use the `AskUserQuestion` tool to ask all applicable questions in a single call (up to 3 questions: Q1, Q2, and Q3 if applicable).

**Q1 — Feature branch base:**

#### develop-story Q1 options

develop-story always uses the epic branch (`{EPIC_BRANCH}`) as the feature branch base. No free-form Q1 is presented. Instead:

- **If `EPIC_BRANCH_EXISTS=false`**: ask one confirmation question via `AskUserQuestion`:
  > "Epic branch `{EPIC_BRANCH}` does not exist yet. It will be created from `develop` before your story branch."
  > Options: "Create epic branch and proceed" (Recommended) / "Abort"

  If the user selects "Abort": HALT cleanly — do not create any branches.

- **If `EPIC_BRANCH_EXISTS=true`**: no question needed. The epic branch will be used automatically. Record this in the Decisions Log.

Store decisions: Feature branch base = `{EPIC_BRANCH}` (always, regardless of current branch).

#### develop-task Q1 options

- On `develop` or `main`: ask "Which branch should the feature branch be created from?" Options: "develop" (Recommended) / "Other"
- On any `feature/*` branch: ask "Which branch should `feature/task.{id}.{name}` be based on?" Options: "`feature/{current}`" (Recommended) / "develop"
  - This applies to all feature branches — whether it's an epic branch, another task branch, or any other feature branch.

**Q2 — PR target branch:**

#### develop-story Q2

develop-story always targets the epic branch. Do **not** ask the user:

- PR target = `{EPIC_BRANCH}` (auto-set, identical to Q1 base)
- Record in Decisions Log: "PR target: {EPIC_BRANCH} (epic branch — auto)"

#### develop-task Q2

Ask "Which branch should the pull request target?" Options: "develop" (Recommended) / "feature/{current-branch}" / "Other"

**Q3 — High-risk gate (only if `risk_level: high` detected):**

#### develop-story Q3

Ask "This story is flagged `risk_level: high`. The `/develop` skill will offer to run `/qa-planning` first. Should this pipeline skip that gate?" Options: "Skip qa-planning" (Recommended) / "Pause at that gate"

#### develop-task Q3

Ask "This task is flagged `risk_level: high`. The `/develop` skill will offer to run `/qa-planning` first. Should this pipeline skip that gate?" Options: "Skip qa-planning" (Recommended) / "Pause at that gate"

If the user selects "Other" for Q1 or Q2, follow up with a plain text request for the branch name. Store all answers. Do not ask again mid-pipeline.

---

## 0e. Create the Implementation Report

Determine the implementation report number: scan the document directory for existing `*.implementation.*.md` files, find the highest N, new report is N+1 (or 1 if none exist). Derive `{descriptive-name}`: N=1 → `{name}-initial-run`; N>1 → append context (e.g. `{name}-post-escalation`, `{name}-retry-{N}`).

#### develop-story implementation report template

Create `story.{epic}.{story}.implementation.{N}.{descriptive-name}.md` in the story directory:

```markdown
# Implementation Report: {story title}

**Story**: `{story filename}`
**Run Number**: {N}
**Started**: {YYYY-MM-DD HH:MM}
**Status**: In Progress

---

## Summary

{One-line description derived from the story name and what this run is attempting}

---

## Pipeline Configuration

| Setting             | Value                         |
| ------------------- | ----------------------------- |
| Epic branch         | {EPIC_BRANCH} (exists / will be created) |
| Feature branch base | {EPIC_BRANCH}                 |
| PR target           | {EPIC_BRANCH}                 |
| High-risk gate      | {Q3 answer or N/A}            |
| Story risk level    | {risk_level value or not set} |
| Pipeline mode       | {lite / standard}             |
| Board status        | {In Progress ✅ / ⚠️ update failed / N/A (no issue linked)} |

---

## Pipeline Progress

| Step | Status | Required Artifacts | Notes | Subagent summary ref |
| ---- | ------ | ------------------ | ----- | -------------------- |
| 1a. create-epic-branch      | ⏳ Pending | Branch `feature/epic.{N}.*` exists in git | | — |
| 1b. create-story-branch     | ⏳ Pending | Branch `feature/story.{epic}.{story}.*` exists in git | | — |
| 2. review-story             | ⏳ Pending | `story.{epic}.{story}.review.{date}.md` exists (or skip logged) | | — |
| 3. develop                  | ⏳ Pending | Story status == `Ready for Review` | | — |
| 4. create-pr                | ⏳ Pending | PR URL targets `{EPIC_BRANCH}`; issue/tracker comment posted | | — |
| 5–6. qa-story / qa-fix loop | ⏳ Pending | `story.{epic}.{story}.qa.{N}.*.md`; `story.{epic}.{story}.gate.{N}.*.yml`; PR comment posted | | — |
| 7. finalise                 | ⏳ Pending | `story.{epic}.{story}.dod.{N}.*.md`; story `status: accepted` | | — |
| 8. commit-changes           | ⏳ Pending | All artifacts committed and pushed | | — |

> The `Subagent summary ref` column points to the JSON artifact described in `shared/resources/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — {YYYY-MM-DD}

- Epic branch: {EPIC_BRANCH} — {exists / created from develop}
- Feature branch base: {EPIC_BRANCH} — epic branch (auto)
- PR target branch: {EPIC_BRANCH} — epic branch (auto)
- High-risk gate handling: {Q3 answer or N/A}

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
```

#### develop-task implementation report template

Create `task.{id}.implementation.{N}.{descriptive-name}.md` in the task directory:

```markdown
# Implementation Report: {task title}

**Task**: `{task filename}`
**Run Number**: {N}
**Started**: {YYYY-MM-DD HH:MM}
**Status**: In Progress

---

## Summary

{One-line description derived from the task name and what this run is attempting}

---

## Pipeline Configuration

| Setting | Value |
|---------|-------|
| Feature branch base | {Q1 answer} |
| PR target | {Q2 answer} |
| High-risk gate | {Q3 answer or N/A} |
| Task risk level | {risk_level value or not set} |
| Pipeline mode | {lite / standard} |
| Board status | {In Progress ✅ / ⚠️ update failed / N/A (no issue linked)} |

---

## Pipeline Progress

| Step | Status | Required Artifacts | Notes | Subagent summary ref |
|------|--------|--------------------|-------|----------------------|
| 1. create-branch | ⏳ Pending | Branch `feature/task.{id}.*` exists in git | | — |
| 2. review-task | ⏳ Pending | `task.{id}.review.{date}.md` exists (or skip logged) | | — |
| 3. develop | ⏳ Pending | Task status == `Ready for Review` | | — |
| 4. create-pr | ⏳ Pending | PR URL; issue comment posted | | — |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; PR comment posted | | — |
| 7. finalise | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted` | | — |
| 8. commit-changes | ⏳ Pending | All artifacts committed and pushed | | — |

> The `Subagent summary ref` column points to the JSON artifact described in `shared/resources/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — {YYYY-MM-DD}
- Feature branch base: {Q1 answer} — {rationale}
- PR target branch: {Q2 answer} — {rationale}
- High-risk gate handling: {Q3 answer or N/A}

---

## Issues Log

*Problems encountered and how they were resolved or escalated.*

---

## QA Iteration History

*Track each QA review/fix cycle.*

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
```

---

## 0f. Pre-flight Summary

Print this to the user before any irreversible action:

#### develop-story

```
🚀 Starting automated story pipeline

Story:        {story filename}
Epic branch:  {EPIC_BRANCH} ← develop  [will be created]
              OR
Epic branch:  {EPIC_BRANCH}  [already exists]
Branch:       feature/story.{epic}.{story}.{name} ← {EPIC_BRANCH}
PR target:    {EPIC_BRANCH}
Report:       {report file path}

Pipeline will now run hands-free.
You will only be interrupted if a blocking issue arises.
Press Ctrl+C now to abort before any changes are made.
```

#### develop-task

```
🚀 Starting automated task pipeline

Task:         {task filename}
Branch:       feature/task.{id}.{name} ← {Q1 base branch}
PR target:    {Q2 answer}
Report:       {report file path}

Pipeline will now run hands-free.
You will only be interrupted if a blocking issue arises.
Press Ctrl+C now to abort before any changes are made.
```

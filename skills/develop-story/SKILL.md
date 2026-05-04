---
name: develop-story
description: Automates the full end-to-end story development lifecycle: create-branch → review-story → develop → create-pr → qa-story → qa-fix (iterative, up to 5 cycles) → finalise → commit-changes. Features: Explore subagent for story resolution and pre-develop codebase mapping; context hygiene between steps; lite mode for low-risk stories; resume from any step; `--base` branch pre-supplied to create-pr. Records all decisions in a co-located implementation report. Invoke with `/develop-story [story-file-path]` or "develop and QA this story end to end".
---

# Develop Story — Automated Lifecycle Orchestrator

This skill orchestrates the complete story development lifecycle, calling each skill in sequence and maintaining an implementation report that records every significant decision and issue encountered along the way.

## Setup — Graceful Pause Hook (one-time, per project)

Long pipelines can hit Claude's context window before reaching Step 8. To make compaction-induced pauses graceful (commit the report, comment the PR, signal the user how to resume), register the bundled `PreCompact` hook in the project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/skills/develop-story/scripts/on-precompact.sh"
          }
        ]
      }
    ]
  }
}
```

The hook noops when no pipeline is active (lock file absent), so it has zero overhead outside `/develop-story` and `/develop-task` runs. See `shared/resources/develop-pipeline-pause.md` for the full pause/resume contract. Setup is optional — without the hook, pipelines still resume correctly via the existing post-compaction recovery, just without the PR comment and pause-state report entry.

## When to Use This Skill

- User says `/develop-story <path>` or passes a story file path
- User wants to run a story through the full automated pipeline without hand-holding each step
- User wants an audit trail of decisions made during story implementation

---

## Phase 0: Resolve & Prepare

### 0a. Resolve the story file

Accept any of:

- **Story file**: `docs/stories/story.8.2.configure-validation-pipe/story.8.2.configure-validation-pipe.md`
- **Story directory**: `docs/stories/story.8.2.configure-validation-pipe/`
- **Bare filename**: `story.8.2.configure-validation-pipe.md`
- **GitHub issue URL** (direct or project board): `https://github.com/.../issues/297` or URL containing `issue=`
- **Issue hash notation**: `#297`
- **Bare issue number**: `297`

**Jira URL / issue key — resolve inline first (when JIRA_URL is set):**

If `JIRA_URL` is set and the input matches a Jira browse URL (contains `atlassian.net/browse/`) or a Jira key pattern (`[A-Z]+-[0-9]+`, e.g. `RB-12`):

1. Extract the Jira key:

```bash
JIRA_KEY=$(echo "$INPUT" | grep -oE '[A-Z]+-[0-9]+' | tail -1)
```

2. Search for a local story file referencing this Jira key:

```bash
LOCAL_PATH=$(grep -rl "jira_key: ${JIRA_KEY}" docs/ 2>/dev/null \
  | grep -v '\.implementation\.' | grep -v '\.review\.' | grep -v '\.gate\.' \
  | head -1)
```

3. If `LOCAL_PATH` is non-empty and the file exists: use it as the resolved story file path — **skip the Explore subagent**.
4. If not found: HALT — inform user "No local document found for Jira issue ${JIRA_KEY}. Run `/create-story` first to link it, or provide the file path directly."

**GitHub URL / issue number — resolve inline first (before Explore subagent):**

If `JIRA_URL` is NOT set and the input matches a GitHub URL (contains `github.com`), `#NNN`, or an all-digit number:

1. Extract the issue number:

```bash
# Direct issue URL:   https://github.com/owner/repo/issues/297
ISSUE_NUM=$(echo "$INPUT" | grep -oE '(?<=/issues/)[0-9]+')

# Project board URL:  ...issue=owner%7Crepo%7C297
# Hash notation:      #297  /  Bare number: 297
# Generic fallback — last group of digits:
[ -z "$ISSUE_NUM" ] && ISSUE_NUM=$(echo "$INPUT" | grep -oE '[0-9]+' | tail -1)
```

2. Fetch the issue body and parse the Document link:

```bash
ISSUE_BODY=$(gh issue view {N} --json body -q '.body')
DOC_URL=$(echo "$ISSUE_BODY" | grep -o 'https://github\.com/[^)]*\.md' | head -1)
LOCAL_PATH=$(echo "$DOC_URL" | sed 's|https://github\.com/[^/]*/[^/]*/blob/[^/]*/||')
```

3. If `LOCAL_PATH` is non-empty and the file exists: use it as the resolved story file path — **skip the Explore subagent**.
4. If no Document link found: fall back to `grep -rl "github_issue: {N}" docs/` and pass the matched directory to the Explore subagent.
5. If still not found: HALT — inform user "No local document found for issue #{N}. Run `/create-story` first, or provide the file path directly."

**Resolution using Explore subagent** (for file/directory/bare-filename inputs):

Use the Agent tool with subagent_type="Explore" to locate the story file. Provide the input path and ask it to:

- Find the file matching `story.{epic}.{story}.*.md` that does NOT contain `.qa.`, `.gate.`, `.bug.`, or `.implementation.` in its name
- Return only: the absolute file path and the story directory path

If the Explore subagent cannot find the file, HALT and ask the user to confirm the path.

Extract `{epic_number}` and `{story_number}` from the pattern `story.{epic}.{story}.{name}.md`.

### 0b. Check pipeline state — resume or restart?

Before asking any questions, check whether a previous run was started for this story:

```bash
git branch --list "feature/story.{epic}.{story}.*"
gh pr list --head "feature/story.{epic}.{story}.*" --json number,url,state 2>/dev/null
ls {story-directory}/story.{epic}.{story}.implementation.*.md 2>/dev/null
```

**If a previous run is detected** (existing branch, PR, or implementation report):

Use the `AskUserQuestion` tool with:

- Question: "A previous pipeline run exists for this story. What would you like to do?"
- Options:
  - "Resume from last completed step" (Recommended) — continue from where the previous run left off
  - "Start fresh" — create a new implementation report (N+1) and restart from Step 1

If resuming: read the existing implementation report, identify the last ✅ step, and verify each completed step's artifact before skipping it. Skip upfront questions that are already recorded in the Decisions Log of the existing report.

**Resume artifact verification (CRITICAL — run before skipping any step)**:

For each step marked ✅ in the implementation report, verify the expected artifact exists. If verification fails, **do not skip the step** — re-run it and log: "Resume verification failed for Step {N} — artifact missing, re-running."

A step marked `⏸️ Paused` (set by the PreCompact hook on graceful pause) is treated identically to `⏳ Pending`: re-run from the start of that step. Earlier `✅` steps still skip per their artifact verification. Log: "Resuming after graceful pause — re-running Step {N}."

| Step             | Artifact to verify | Verification command |
| ---------------- | ------------------ | -------------------- |
| 1. create-branch | Branch exists in git | `git branch --list "feature/story.{epic}.{story}.*"` returns the branch |
| 3. develop       | All tasks complete | Story file `Status:` field reads `Ready for Review` |
| 4. create-pr     | PR exists | `gh pr view {PR-number} --json state` returns open or merged |
| 5–6. qa loop     | **Both** `story.{epic}.{story}.qa.{N}.*.md` **and** `story.{epic}.{story}.gate.{N}.*.yml` exist **and** PR comment posted | `ls {story-directory}/story.*.qa.*.md` AND `ls {story-directory}/story.*.gate.*.yml` — gate alone is insufficient |
| 7. finalise      | **All three**: `story.{epic}.{story}.dod.{N}.*.md` exists **and** story `status:` reads `accepted` **and** finalise acceptance comment posted to PR | `ls {story-directory}/story.*.dod.*.md` AND `grep -iE "^status:\s*accepted" {story-file}` AND `gh pr view {PR} --comments --json comments \| grep -i "Accepted"` |

Steps 2 and 8 do not require artifact verification beyond reading the implementation report.

**Plan freshness (Step 3 prerequisite)**: If the Decisions Log records a plan file from a prior session and Step 3 is being resumed, verify the plan file is at least as fresh as the story file:

```bash
[ "$(stat -f %m {story-directory}/story.{epic}.{story}.plan.*.md)" -ge "$(stat -f %m {story-file})" ]
```

(macOS `stat`. On Linux use `stat -c %Y`.) If the plan is stale (older than the story), do **not** reuse it — drop the cached "Pre-develop surface map:" entry from the in-memory resume context, re-run the Explore subagent, and re-discover the plan file. Log: "Plan file stale on resume (mtime < story mtime) — re-running pre-develop discovery." Cap re-discovery at **1 retry per resume** to prevent loops; if the plan is still stale after the retry, proceed with the latest plan and log a warning. If no plan file exists in the directory, the freshness check is a no-op.

**CRITICAL — Do not conflate gate file with QA completion**: A `gate.yml` written manually (without running `/qa-review`) does NOT satisfy Step 5–6. The required artifacts are the `qa.N.md` report file (created by `/qa-review`) AND the `gate.N.yml`. Similarly, updating DoD checkboxes in the story doc does NOT satisfy Step 7 — `/finalise` must write a separate `dod.N.md` file AND post an acceptance comment to the PR.

**QA cycle count reconstruction (if resuming at Step 5–6)**:
If the last completed step was within the QA loop, count the number of `### QA Cycle` entries in the QA Iteration History section of the implementation report:

```bash
grep -c "^### QA Cycle" {implementation-report-path}
```

Set the cycle counter to this value before re-entering the loop. This ensures the 5-cycle limit is respected across resumes.

Also cross-check the recorded state against current reality:

```bash
# Verify branch still exists
git branch --list "$(grep 'Branch:' {implementation-report} | awk '{print $2}')"
# Verify PR still exists
gh pr view "$(grep 'PR:' {implementation-report} | awk '{print $2}')" --json state 2>/dev/null
```

If the branch or PR no longer matches, warn the user before proceeding: "Pipeline state has diverged — recorded branch/PR may differ from current state. Proceeding anyway."

If starting fresh: continue to 0c.

### 0c. Read the story for upfront context

Before asking questions, read the story file and note:

- Story title (for implementation report naming)
- `Status:` field — see autonomous handling rules below
- `risk_level:` field (high / medium / low / absent)
- Tracker issue — detect platform first, then read the appropriate frontmatter field:

```bash
if [ -n "$JIRA_URL" ]; then
  TRACKER="jira"
  TRACKER_ISSUE=$(grep '^jira_key:' {story-file} | awk '{print $2}')
  if [ -z "$TRACKER_ISSUE" ] || [ "$TRACKER_ISSUE" = "null" ]; then
    echo "⚠️ No Jira issue linked (jira_key absent or null) — tracker references will be skipped. Run /create-story first to create a Jira issue for this story."
    TRACKER_ISSUE=""
  fi
else
  TRACKER="github"
  TRACKER_ISSUE=$(grep '^github_issue:' {story-file} | awk '{print $2}')
  GITHUB_ISSUE="$TRACKER_ISSUE"   # kept for backward compatibility with sub-skills
  if [ -z "$TRACKER_ISSUE" ] || [ "$TRACKER_ISSUE" = "null" ]; then
    echo "No GitHub Issue linked — issue references will be skipped"
    TRACKER_ISSUE=""
    GITHUB_ISSUE=""
  fi
fi
```

- `TRACKER` (`jira` or `github`) and `TRACKER_ISSUE` (Jira key or GitHub issue number) are pipeline-wide variables — every subsequent branch uses them

**Autonomous status handling:**

| Status                         | Action                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ready for Development`        | Proceed normally                                                                                                                                      |
| `In Progress`                  | Proceed normally                                                                                                                                      |
| `Draft`                        | Note it in the implementation report. Proceed — Step 2 will run `/review-story` to validate and upgrade the status autonomously. Do NOT ask the user. |
| `Ready for Review`, `Accepted` | HALT — story is already past development. Ask the user if they want to re-run or check the wrong story path.                                          |
| Any other status               | HALT — status is unexpected. Report to user before proceeding.                                                                                        |

**Lite mode detection**: After reading the story, evaluate whether all three conditions are met:

- `risk_level: low` or absent, AND
- Fewer than 3 Tasks defined in the story, AND
- Story touches a single module (single app or lib)

If all three conditions are met, set `PIPELINE_MODE=lite` and log it in the implementation report Pipeline Configuration table. In lite mode:

- Step 5 (qa-story) uses **Direct Tools only** (skips parallel agents regardless of the adaptive strategy decision)
- Step 5b (qa-fix) still runs if issues are found
- All other steps run unchanged

If any condition is not met, `PIPELINE_MODE=standard` (default, no change to behaviour).

### 0c-reg. Signal Work Started

If `TRACKER_ISSUE` is set (extracted in Phase 0c), signal that work has started on the linked tracker issue. Branch on `TRACKER`:

#### Jira path (when `TRACKER=jira`):

Use the Atlassian MCP tools — no auth management needed. Derive `cloudId` from `JIRA_URL` by extracting the hostname (e.g. `mediastreamag.atlassian.net` from `https://mediastreamag.atlassian.net`). If a tool call fails with a cloud resolution error, call `getAccessibleAtlassianResources` and use the `id` field from the matching entry.

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

#### GitHub path (when `TRACKER=github`):

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

### 0d. Upfront Setup — gather all decisions before execution

Check the current branch:

```bash
git branch --show-current
```

Use the `AskUserQuestion` tool to ask all applicable questions in a single call (up to 3 questions: Q1, Q2, and Q3 if applicable). Build the questions as follows:

---

**Q1 — Feature branch base:**

- On `develop` or `main`:
  - Question: "Which branch should the feature branch be created from?"
  - Options:
    - "develop" (Recommended) — standard Gitflow base
    - "Other" — specify a custom branch name

- On `feature/story.X.Y.*` and new story shares the same `X.Y` prefix (sub-story):
  - Question: "Detected a possible sub-story. Which branch should `feature/story.{epic}.{story}.{name}` be based on?"
  - Options:
    - "feature/story.X.Y.{current}" (Recommended) — groups sub-story with parent
    - "develop" — independent feature

- On unrelated `feature/*` branch:
  - Question: "Which branch should `feature/story.{epic}.{story}.{name}` be based on?"
  - Options:
    - "develop" (Recommended) — standard Gitflow base
    - "feature/{current}" — only if this story depends on uncommitted work here

**Q2 — PR target branch:**

- Question: "Which branch should the pull request target?"
- Options:
  - "develop" (Recommended) — standard Gitflow
  - "feature/{parent-branch}" — if this is a sub-story
  - "Other" — specify a custom branch name

**Q3 — High-risk story gate (only include this question if `risk_level: high` detected):**

- Question: "This story is flagged `risk_level: high`. The `/develop` skill will offer to run `/qa-planning` first. Should this pipeline skip that gate?"
- Options:
  - "Skip qa-planning" (Recommended) — proceed autonomously
  - "Pause at that gate" — let me decide when we get there

---

If the user selects "Other" for Q1 or Q2, follow up with a plain text request for the branch name before proceeding.

Store all answers. Do not ask again mid-pipeline.

### 0e. Create the implementation report

After gathering all answers, determine the implementation report number:

- Scan `{story-directory}` for files matching `story.{epic}.{story}.implementation.*.md`
- Find the highest existing `N`; the new report is `N+1` (or `1` if none exist)
- Derive `{descriptive-name}`:
  - If N = 1: `{story-name}-initial-run`
  - If N > 1: append context based on why this is a new run, e.g. `{story-name}-post-escalation` or `{story-name}-retry-{N}`

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
| Feature branch base | {Q1 answer}                   |
| PR target           | {Q2 answer}                   |
| High-risk gate      | {Q3 answer or N/A}            |
| Story risk level    | {risk_level value or not set} |
| Pipeline mode       | {lite / standard}             |
| Board status        | {In Progress ✅ / ⚠️ update failed / N/A (no issue linked)} |

---

## Pipeline Progress

| Step | Status | Required Artifacts | Notes |
| ---- | ------ | ------------------ | ----- |
| 1. create-branch            | ⏳ Pending | Branch `feature/story.{epic}.{story}.*` exists in git | |
| 2. review-story             | ⏳ Pending | `story.{epic}.{story}.review.{date}.md` exists (or skip logged) | |
| 3. develop                  | ⏳ Pending | Story status == `Ready for Review` | |
| 4. create-pr                | ⏳ Pending | PR URL; issue/tracker comment posted | |
| 5–6. qa-story / qa-fix loop | ⏳ Pending | `story.{epic}.{story}.qa.{N}.*.md`; `story.{epic}.{story}.gate.{N}.*.yml`; PR comment posted | |
| 7. finalise                 | ⏳ Pending | `story.{epic}.{story}.dod.{N}.*.md`; story `Status: Accepted` | |
| 8. commit-changes           | ⏳ Pending | All artifacts committed and pushed | |

---

## Decisions Log

### Pipeline Startup — {YYYY-MM-DD}

- Feature branch base: {Q1 answer} — {rationale}
- PR target branch: {Q2 answer} — {rationale}
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

### 0f. Pre-flight summary

Print this to the user before any irreversible action:

```
🚀 Starting automated story pipeline

Story:        {story filename}
Branch:       feature/story.{epic}.{story}.{name} ← {Q1 base branch}
PR target:    {Q2 answer}
Report:       {report file path}

Pipeline will now run hands-free.
You will only be interrupted if a blocking issue arises.
Press Ctrl+C now to abort before any changes are made.
```

---

## Phase 1: Pipeline Execution

### Context Compression Recovery (CRITICAL — read this first)

If context was compressed while this pipeline was running (i.e., the conversation was summarized and you are now resuming), follow this sequence exactly — do not improvise:

**Step 0 — Re-read the full skill file before anything else:**
```bash
# The skill instructions in the system reminder are TRUNCATED after compression.
# Improvising steps from memory produces wrong artifacts and misses required invocations.
# Always read the full skill first:
cat .agents/skills/develop-story/SKILL.md
```
Output: "⚠️ Context recovery — re-reading full skill file before resuming."

**Step 1 — Recover pipeline state from the implementation report:**
```bash
ls {story-directory}/story.{epic}.{story}.implementation.*.md 2>/dev/null | sort | tail -1
```

1. Read the implementation report. Find the last ✅ step in the Pipeline Progress table.
2. **Verify each ✅ step's artifact exists** (see Resume artifact verification table above) — do not trust the report alone.
3. Output: "⚠️ Context recovery — last verified step: Step {N}. Resuming from Step {N+1}."
4. Continue from Step {N+1} — do NOT re-run completed steps, do NOT skip any pending steps.

**This recovery is mandatory even if the user did not explicitly re-invoke `/develop-story`.** If you are in a conversation where `develop-story` was previously running and context was then compressed, you are still the develop-story orchestrator and must complete all remaining steps. A context summary saying "next step: create-pr" does NOT mean the pipeline ends after create-pr — it means Step 4 is next, and Steps 5–8 still follow.

### Graceful Pause on Imminent Compaction (CRITICAL — read this second)

This complements the post-compaction recovery above. **Pre**-compaction graceful pause requires the `PreCompact` hook to be installed (see Setup section at the top of this file). When the hook fires:

1. The hook itself appends a "Pipeline Paused" entry to the implementation report, commits, pushes, and posts a PR/issue comment — all best-effort, all done before compaction proceeds.
2. The hook emits `🛑 PIPELINE-PAUSE-SIGNAL` as `additionalContext` to you, which appears as a `<system-reminder>` in your next turn.
3. The hook removes the lock file.

**When you observe `🛑 PIPELINE-PAUSE-SIGNAL` in a system reminder:**

1. **Stop everything.** Do not invoke any sub-skill. Do not edit the implementation report (the hook already did). Do not run any tools beyond what's needed for the user-facing summary.
2. **Output the pause banner**:
   ```
   ═══ DEVELOP-STORY PIPELINE: PAUSED — CONTEXT COMPACTION IMMINENT ═══
   ```
3. **Output the user-facing summary** using the template provided in the signal's `additionalContext`. If the signal indicates `tracker=jira`, add a single-line note that the Jira issue was *not* commented on (Jira pause is silent by design).
4. **HALT.** Do not proceed to any further step. The lock file has been removed by the hook; on next user invocation of `/develop-story <path>`, Phase 0b will detect the existing run, read the report, and resume cleanly.

**No additional report edits, no additional commits, no additional comments** — the hook already did all of that, and you have very little budget left before compaction proceeds. Spending it on duplicate work risks losing the user-facing summary entirely.

For the full lock-file format, hook contract, and half-done step recovery semantics, see `shared/resources/develop-pipeline-pause.md`.

### Context Management Rule (CRITICAL)

After EVERY step completes, before moving to the next step:

1. Retain only: step outcome (pass/fail), key decisions made, file paths of artifacts produced
2. Release all intermediate file contents from active consideration — do not re-read files that were already processed unless specifically needed
3. Summarize the step result in ≤5 bullet points in the implementation report, then treat step as closed

This prevents context accumulation across the 8-step pipeline.

**Never stop between steps.** This pipeline runs hands-free from Step 1 to Step 8. Never output a "done" or "complete" message and stop unless a step explicitly results in HALT or the pipeline has reached Step 8. Completing Step 4 (create-pr) is NOT a terminal state — Step 5 must follow immediately.

**Step banners (required).** Before starting each step, output a visible banner:

```
═══ DEVELOP-STORY PIPELINE: STEP {N}/8 — {STEP-NAME} ═══
```

This creates persistent checkpoints that survive context compression and make the pipeline position unambiguous.

**Lock file `current_step` update (required, Steps 2–8).** Immediately after the banner, update the pipeline lock file so the PreCompact hook knows where the pipeline is:
```bash
jq --argjson n {N} '.current_step = $n' .claude/state/develop-pipeline.lock \
  > .claude/state/develop-pipeline.lock.tmp && mv .claude/state/develop-pipeline.lock.tmp .claude/state/develop-pipeline.lock
```
Skip this for Step 1 (the lock is created at the *end* of Step 1, after the feature branch exists — see Step 1 below).

After each step: update the Pipeline Progress table (✅ Done / ❌ Failed / ⚠️ Needs Attention / ⏸️ Paused — see Graceful Pause section) and log any decisions or issues before moving on.

### Step 1: Create Branch

**Pre-flight board check (mandatory gate before create-branch — GitHub only):**

If `TRACKER=github` and `TRACKER_ISSUE` is set, verify the board status before proceeding. This catches cases where Phase 0c-reg was skipped or silently failed:

```bash
BOARD_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')
BOARD_STATUS=$(gh project item-list "$BOARD_NUM" --owner "$(gh repo view --json owner -q '.owner.login')" --format json 2>/dev/null \
  | jq -r '.items[] | select(.content.number == {TRACKER_ISSUE}) | .status // "unknown"')
echo "Board status for #{TRACKER_ISSUE}: $BOARD_STATUS"
```

- If `$BOARD_STATUS` is `In Progress`: proceed — 0c-reg succeeded.
- If `$BOARD_STATUS` is `Todo` or `unknown`: re-run the full 0c-reg GitHub board update (GraphQL mutation from Phase 0c-reg above), then re-check. Log the outcome in the implementation report Pipeline Configuration table (`Board status` row).
- If the retry also fails: log `⚠️ Board status update failed — proceeding without board update` in the Issues Log and continue.

If `TRACKER=jira` and `TRACKER_ISSUE` is set, call `getJiraIssue` MCP tool to verify the issue is "In Progress" before proceeding:
- `cloudId`: {hostname from `JIRA_URL`}, `issueIdOrKey`: `{TRACKER_ISSUE}`, `fields: ["status"]`
- If `fields.status.name` is "In Progress": proceed — 0c-reg succeeded
- If not "In Progress": re-apply transition using `getTransitionsForJiraIssue` + `transitionJiraIssue` (same pattern as 0c-reg step 2); log outcome in Pipeline Configuration table (`Tracker status` row)
- If retry fails: log `⚠️ Jira status update failed — proceeding` in Issues Log and continue

Before invoking `/create-branch`, stash the implementation report to ensure a clean working directory:

```bash
git stash push --include-untracked -m "develop-story: implementation report pre-branch" -- {implementation-report-path}
```

Invoke the `/create-branch` skill with the story file path.

When `create-branch` asks which base branch to use, select the Q1 answer from Upfront Setup — do not prompt the user again.

After `/create-branch` completes and the feature branch is checked out, restore the stash:

```bash
git stash pop
```

If stash pop fails, recover the report with:

```bash
git stash show -p stash@{0} | grep -A 9999 "^+++ b/{report-filename}" | tail -n +2 > {implementation-report-path}
git stash drop stash@{0}
```

If that also fails, run `git stash list` to find the stash index and `git stash show -p stash@{N}` to inspect it, then manually recreate the report file from the output. Log this in Decisions Log: "Implementation report stashed before branch creation, restored after (or manually recovered)."

After the branch is created:

- Record the branch name in the Decisions Log and in the **Branch** field of the Completion section
- Run `git log --oneline -1` to capture the initial commit hash; record it in the Pipeline Progress Notes: e.g. `Branch created at \`{hash}\``
- Update Pipeline Progress: ✅ create-branch

**Write the pipeline lock file** (enables the PreCompact graceful-pause hook from this point onward):
```bash
mkdir -p .claude/state
cat > .claude/state/develop-pipeline.lock <<EOF
{
  "skill": "develop-story",
  "report_path": "{implementation-report-path}",
  "task_or_story_id": "{epic}.{story}",
  "task_or_story_directory": "{story-directory}",
  "branch": "{branch-name}",
  "pr_url": "",
  "tracker": "{TRACKER}",
  "tracker_issue": "{TRACKER_ISSUE}",
  "current_step": 1,
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```
The lock file is read by `.claude/skills/develop-story/scripts/on-precompact.sh` if compaction fires. From Step 2 onward, the per-step banner directive updates `current_step`. Step 4 also writes `pr_url` after the PR is created.

**On failure**: Update Pipeline Progress ❌, log in Issues Log. **Do not commit the report** — no feature branch exists yet and committing on the base branch would pollute it. Save the report file to disk and tell the user its path so they can recover manually. Do **not** write the lock file (no branch = hook can't safely commit). Then HALT with the error details.

### Step 2: Review Story

**Gate check**: Re-read the story file's `Status:` field (captured in Phase 0). Then check for an existing review report:

```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```

Apply these rules:

| Pre-review status       | Review report exists? | Action                                                                               |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `Draft`                 | Either                | Run `/review-story` — story needs validation and promotion                           |
| `Ready for Development` | Yes                   | **Skip** — story reviewed and report exists; log and proceed                         |
| `Ready for Development` | No                    | Run `/review-story` — status set without completing a review                         |
| `In Progress`           | Yes                   | **Skip** — review already completed; log and proceed                                 |
| `In Progress`           | No                    | Run `/review-story` — story may have been marked In Progress without a proper review |

**If skipping (status non-Draft AND review report confirmed)**:

- Log in Decisions Log: "review-story skipped — story status is `{status}` and review report exists at `{path}`"
- Update Pipeline Progress: ✅ review-story (skipped — already reviewed)
- Proceed to Step 3

**If status IS `Draft` (run path)**:

Invoke the `/review-story` skill with the story file path.

**Output format gate**: When `/review-story` asks "Would you like a comprehensive review report saved to a file, or just an actionable plan?" (Step 0 of that skill), **always select "Comprehensive report"**. The pipeline requires a persisted review report co-located with the story file. Do not select "Action plan only" — log this autonomous decision in the Decisions Log: "review-story output: Comprehensive report — required for pipeline audit trail".

After review-story completes, locate the generated review report:

```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```

Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-story did not produce a review report file") but do not halt — continue to outcome detection.

**Detecting outcomes**: After review-story completes, re-read the story file and check the `Status:` field. Apply these autonomous rules:

| Post-review status      | Action                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `Ready for Development` | Proceed — draft promoted                                           |
| `In Progress`           | Proceed — acceptable intermediate state                            |
| `Draft` (unchanged)     | review-story left it Draft — log as issue, HALT and report to user |
| Downgraded / unclear    | HALT — report to user                                              |

**Handling findings**:

- **Draft → Ready for Development**: Log "Draft promoted to Ready for Development by review-story" in Decisions Log. Proceed autonomously.
- **Blocking issues** (contradictory specs, missing ACs, status still `Draft`): Log in Issues Log, invoke `/commit-changes` (message: `docs(story.{epic}.{story}): implementation report — review-story blocking halt`), then HALT.

Update Pipeline Progress: ✅ review-story

### Step 3: Develop

Invoke the `/develop` skill with the story file path.

**Pre-develop codebase mapping (CRITICAL for context efficiency):**

**Resume optimization:** If the Decisions Log already contains a "Pre-develop surface map:" entry (from a prior session), skip both the Explore subagent invocation AND the plan file discovery below — reuse the recorded surface map and plan-file decision. Log: "Resume — pre-develop surface map and plan-file decision reused from Decisions Log." Then proceed to the develop loop.

Before invoking `/develop`, use the Agent tool with subagent_type="Explore" to map the codebase surface for this story:

- Ask it to find: all files likely affected by the acceptance criteria, existing patterns in the same module/layer, test file conventions for the affected areas, any files explicitly named in the story's Dev Notes or Tasks
- Return a compact summary: file path + 1-line description per file (max 20 files)

Pass this summary to the `/develop` skill as context. Do NOT read these files again in the main context — the summary is sufficient for `/develop` to make informed decisions.

Log the Explore summary in the Decisions Log: "Pre-develop surface map: {N} files identified in {affected modules}".

**Pass this summary to `/develop`**: When invoking `/develop`, present the Explore summary as initial context so `/develop` does NOT need to run its own independent file discovery. This prevents duplicate exploration. State explicitly: "Codebase surface map already completed — {summary}. Proceed directly to alignment analysis using this map."

**Plan file discovery (CRITICAL — check before invoking /develop)**:

After the Explore subagent returns, look for a co-located plan file in the story directory:
```bash
ls {story-directory}/story.{epic}.{story}.plan.*.md 2>/dev/null
```
If found, read the plan file and include its content as additional context when invoking `/develop`. The plan file contains implementation-level detail (code snippets, exact file changes, function signatures) that supplements the story's Tasks section. Log in Decisions Log: "Plan file found: {path} — included as implementation context for /develop".

If no plan file exists, proceed without it — plan files are optional (only present for stories created after the co-located plan feature was added).

**Handling the develop skill's internal gates**:

- **Draft status gate**: If develop asks "is this draft ready?", answer **Yes** and automatically select "Yes, ready to implement". Rationale: `/review-story` already validated and promoted the story in Step 2 — the draft gate in `/develop` is redundant when called from this pipeline. Log in Decisions Log: "Draft gate auto-answered: Yes — review-story validation in Step 2 is sufficient."
- **High-risk gate** (`risk_level: high`): Use the Q3 answer from Upfront Setup. The `/develop` skill presents three options: "Run `/qa-planning` now", "Skip, I've already planned", "Skip, low actual risk". If Q3 = "Skip qa-planning", automatically select **"Skip, I've already planned"** and log it. If Q3 = "Pause at that gate", let the user respond to the develop prompt interactively. Note: develop also offers a third option "Skip, low actual risk" — if develop presents this option in the context where Q3 = "Skip qa-planning", treat it as equivalent to "Skip, I've already planned" and select it; do not surface the distinction to the user.
- **Alignment mismatch gate**: If develop finds existing code that differs from the story, automatically select "Align code to document" — the document is the source of truth. Log this in Decisions Log.

**Develop loop — run until all tasks complete (bounded):**

Before iteration 1: count **any** `[x]` checkbox in the story regardless of indent (top-level Tasks AND nested subtasks both count as progress signal). Record `INITIAL_COMPLETED`. Count total checkboxes (`[ ]` + `[x]`, any indent) as `M`. Capture `LAST_COMMIT_HASH=$(git rev-parse HEAD)`. Set `ITER=1`, `MAX_ITER=5`, `LAST_COMPLETED=INITIAL_COMPLETED`.

```bash
# Count any checked box (top-level or nested):
grep -cE '\[x\]' {story-file}
# Count total checkboxes:
grep -cE '\[[ x]\]' {story-file}
```

LOOP:

1. Invoke `/develop` with the story file path. On iteration 1, pass the Explore surface map and plan file (or note that both were reused per Decisions Log on resume). On iteration ≥2, pass only the message: "Resuming from partial completion — see story checkboxes for completed tasks."
2. After `/develop` returns, **re-read the story file from disk** (do not use cached content). Read the `Status:` field plus current `[x]` count (any indent) as `CURRENT_COMPLETED`. Capture `CURRENT_COMMIT_HASH=$(git rev-parse HEAD)`.
3. Branch on status:
   - `Ready for Review` → EXIT loop — all tasks done, proceed to Step 4
   - `Accepted` → EXIT loop — unexpected in pipeline mode (the "Pipeline bypass check" in `develop/SKILL.md` should prevent `/develop` from calling `/finalise`); treat as success; pipeline Step 7 re-runs `/finalise` after QA regardless. Log the unexpected status in Issues Log.
   - `In Progress` → check progress safeguards. **Progress is made if EITHER `CURRENT_COMPLETED > LAST_COMPLETED` OR `CURRENT_COMMIT_HASH != LAST_COMMIT_HASH`** (a new commit on the branch counts as progress even if no checkbox ticked, e.g. when only subtask work or test fixes were committed):
     - If **no progress** (both equal): HALT. Log in Issues Log: "Step 3 stall: /develop returned `In Progress` without ticking a checkbox or producing a new commit (iteration {ITER}, {CURRENT_COMPLETED}/{M})". Set report status to `Escalated` and HALT per the On-halt rule below.
     - If `ITER >= MAX_ITER`: **iteration cap reached** — HALT. Log: "Step 3 hit MAX_ITER={MAX_ITER} without reaching `Ready for Review` ({CURRENT_COMPLETED}/{M} ticks). Manual intervention required." HALT per the On-halt rule below.
     - Otherwise: log "Step 3 iteration {ITER}: {CURRENT_COMPLETED}/{M} ticks complete (commit-progress: {yes/no}). Re-invoking /develop." Append to the Notes column of the Step 3 row in the Pipeline Progress table: `(iter {ITER}: {CURRENT_COMPLETED}/{M} ticks)`. Set `LAST_COMPLETED=CURRENT_COMPLETED`, `LAST_COMMIT_HASH=CURRENT_COMMIT_HASH`, increment `ITER`. **Output the Remaining Work Status banner (see below) before re-invoking.**
   - Any other status → HALT; log the actual status in Issues Log.

Update Pipeline Progress: ✅ develop

**Do not pause, do not summarise to the user, do not wait.** Proceed directly to Step 4.

**Remaining Work Status banner (required — output after each develop-loop iteration that continues, and after Steps 1, 2, 4, 5–6, and 7 complete)**:

Read the story file to get unchecked `[ ]` task names from the Tasks section. Output:

```
═══ REMAINING WORK STATUS ═══
Pipeline position:  Step {N}/8 — {STEP-NAME} {✅ just completed / ⏳ in progress, iter {ITER}/{MAX_ITER}}

Remaining story tasks ({X} of {M} tasks complete):
  ✅ Task {n}: {name}      ← already ticked
  ⬜ Task {n+1}: {name}   ← still to do
  ...

Pipeline steps still ahead:
  - Step {next-step}: {name}
  - ...
  - Step 9: commit-changes + push
```

Omit the "Remaining story tasks" block once Step 3 is ✅ complete. Keep the banner brief — one block per event, not one per sub-step.

**On halt**: Log the reason in Issues Log, invoke the `/commit-changes` skill to save the report (suggested message: `docs(story.{epic}.{story}): implementation report — develop halt`), then HALT with the report path.

### Step 4: Create PR

Invoke the `/create-pr` skill passing `--base {Q2_answer}` (e.g., `/create-pr --base develop`). Branch on tracker platform for the `--issue` flag:

- **GitHub** (`TRACKER=github`): also pass `--issue {TRACKER_ISSUE}` (e.g., `/create-pr --base develop --issue 42`) — `create-pr` will add `Closes #N` to the PR body and comment on the GitHub issue.
- **Jira** (`TRACKER=jira`): omit `--issue` — `create-pr` handles Bitbucket PR creation natively; Bitbucket Issues are not enabled for this project, so passing `--issue` would cause a failed comment attempt. The PR body will reference the story file which contains `jira_key`.

This pre-supplies the target branch via create-pr's Step 0, skipping the interactive prompt entirely. Do not wait for create-pr to ask — Q2 is already resolved.

**Important**: `create-pr` will automatically commit any uncommitted code changes before opening the PR. At this point the implementation report is partially complete (Steps 1–3 documented). **CRITICAL**: The implementation report file must NOT be included in create-pr's auto-commit. Before invoking create-pr, proactively unstage the report if it was staged:

```bash
git restore --staged {implementation-report-path} 2>/dev/null || true
```

After create-pr completes, verify the report was not committed by checking `git log -1 --name-only`. If it was included, note this in the Issues Log (it does not warrant a halt — the report will simply be updated again in Step 8 with a superseding commit).
The report will continue to be updated through Steps 5–8, and its final state will be captured in the dedicated Step 8 commit.

After the PR is created:

- Record the PR URL in the Decisions Log and in the **PR** field of the Completion section
- Update Pipeline Progress Notes: `PR #{N}: {url}` — e.g. `PR #42: https://github.com/org/repo/pull/42`
- Update Pipeline Progress: ✅ create-pr
- **Update the lock file with the PR URL** so the PreCompact hook can post pause comments:
  ```bash
  jq --arg url "{PR_URL}" '.pr_url = $url' .claude/state/develop-pipeline.lock \
    > .claude/state/develop-pipeline.lock.tmp && mv .claude/state/develop-pipeline.lock.tmp .claude/state/develop-pipeline.lock
  ```

**Jira tracker update (when `TRACKER=jira` and `TRACKER_ISSUE` is set):**

After extracting the PR URL from `create-pr`'s output, use the Atlassian MCP tools:

1. **Post PR-opened comment** — call `addCommentToJiraIssue`:
   - `cloudId`: {hostname from `JIRA_URL`}
   - `issueIdOrKey`: `{TRACKER_ISSUE}`
   - `commentBody`: `"PR opened — {PR_URL}"`
   - `contentFormat`: `"markdown"`
   - On failure: log warning and continue (non-blocking)

2. **Transition to "In Review"** — call `getTransitionsForJiraIssue` then `transitionJiraIssue`:
   - Call `getTransitionsForJiraIssue` with `cloudId` and `issueIdOrKey: {TRACKER_ISSUE}`
   - Find a transition matching "In Review", "Code Review", or "Ready for Review" (case-insensitive, try in that order)
   - If found: call `transitionJiraIssue`; log "✅ Jira issue {TRACKER_ISSUE} moved to {transition name}"
   - If not found: log "⚠️ No review-phase transition available — issue remains In Progress" (non-blocking)

Log in Decisions Log: "Jira {TRACKER_ISSUE} — PR comment posted; status: {transition name or 'In Progress (no review transition)'}."

**On failure**: Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(story.{epic}.{story}): implementation report — create-pr failure`), push, then HALT.

**PIPELINE DOES NOT END HERE. Steps 5–8 are mandatory.** Output immediately:

```
═══ DEVELOP-STORY PIPELINE: STEP 4/8 COMPLETE ═══
PR created: {PR URL}
Proceeding to Step 5: QA Review — do not stop
```

Then continue directly to Step 5–6 without waiting for user input.

### Step 5–6: QA Review / Fix Loop

This is the iterative heart of the pipeline. Maintain a **QA cycle counter** starting at 1. The loop limit is **5 complete cycles** (each cycle = one qa-story + one qa-fix). A clean PASS on any qa-story exits the loop immediately.

#### Finding the latest gate file

After each qa-story, locate the most recent gate file:

```bash
ls {story-directory}/story.{epic}.{story}.gate.*.yml | sort -t. -k5 -n | tail -1
```

The gate file pattern is `story.{epic}.{story}.gate.{N}.{name}.yml` — field 5 (dot-delimited) is the numeric gate index. Read this file to determine the gate result.

#### Each cycle:

**5a. Run QA Review**

Invoke the `/qa-story` skill with the story file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story is running in lite mode."

After completion, find and read the latest gate file. Determine outcome:

- `PASS` with no `top_issues` → exit loop, proceed to Step 7
- `CONCERNS`, `FAIL`, or has `top_issues` → proceed to 5b

Log the result in the QA Iteration History section:

```
### QA Cycle {N} — {YYYY-MM-DD}
**Gate Result**: {PASS / CONCERNS / FAIL}
**Issues Found**: {count and brief descriptions, or "none"}
**Action**: {Proceeding to finalise / Running qa-fix (cycle N of 5)}
```

**5b. Run QA Fix**

Invoke the `/qa-fix` skill with the path to the most recent **gate file** (the `.yml` file located using the sort command above). The gate file is the authoritative source of issues for qa-fix.

After fixes are applied: 0. **Check for actual changes**: Before committing, run `git diff --stat HEAD` to verify qa-fix actually modified files. If no files changed (qa-fix made no code edits), do NOT increment the cycle counter. Instead:

- Log in Issues Log: "QA Cycle {N}: qa-fix made no code changes — issues may be unfixable with current approach"
- HALT with: "qa-fix could not address the remaining issues. Human review required. See implementation report for details."

1. Invoke the `/commit-changes` skill to stage and commit the fix changes. The commit message should follow Conventional Commits: `fix(story.{epic}.{story}): qa-fix cycle {N} — {brief summary of fixes}`. The implementation report does NOT need to be included in this commit — it will be finalised in Step 8.
2. Run `git log --oneline -1` to capture the fix commit hash.
3. Push to the remote branch so the PR reflects the latest changes:
   ```bash
   git push origin HEAD
   ```
4. Log what was fixed in the QA Cycle entry:
   ```
   **Fixes Applied**: {brief description of what qa-fix changed}
   **Commit**: `{hash}`
   ```
5. Increment the cycle counter and return to 5a.

#### Loop limit escalation (after 5 cycles without PASS)

Before halting, write a thorough escalation entry in the Issues Log:

```
### QA Loop Limit Reached — {YYYY-MM-DD}

The pipeline completed 5 qa-story/qa-fix cycles without a clean PASS.

**Final gate status**: {status}
**Remaining issues** (from final gate file):
{List each top_issue: description, severity, file/location if known}

**What was attempted per cycle**:
- Cycle 1: {fixes applied}
- Cycle 2: {fixes applied}
- Cycle 3: {fixes applied}
- Cycle 4: {fixes applied}
- Cycle 5: {fixes applied}

**Likely root cause**: {Assessment — e.g., architectural mismatch, missing test
infrastructure, acceptance criteria that cannot be met with current approach}

**Recommended next steps**:
1. {Specific action}
2. {Specific action}
3. {Specific action — e.g., update story if issues reflect out-of-scope requirements}
```

Set report status to `Escalated`. Invoke the `/commit-changes` skill to commit the implementation report. Suggested commit message: `docs(story.{epic}.{story}): implementation report — qa loop escalation`. Then push:

```bash
git push origin HEAD
```

HALT with:

```
⚠️ Story Development Paused — QA Loop Limit Reached

Story:               {story filename}
QA cycles completed: 5
Final gate status:   {status}
Implementation Report: {report file path}

The implementation report contains a full breakdown of every issue and fix attempted.
Options:
1. Fix remaining issues manually, then re-run /qa-story
2. Accept the current gate status and proceed manually with /finalise
3. Update the story requirements if issues reflect unintended scope
```

### Step 7: Finalise

Invoke the `/finalise` skill with the story file path.

**Detecting completion**: After finalise returns, read the story file and check the `Status:` field:

- `Accepted` → success, continue
- Any other status, or if finalise listed DoD gaps → halt

**If DoD gaps are found**: Log each gap with specific detail in Issues Log. Invoke the `/commit-changes` skill to commit the implementation report before halting so the audit trail is in git. Suggested commit message: `docs(story.{epic}.{story}): implementation report — finalise gaps identified`. Then push:

```bash
git push origin HEAD
```

Then HALT:

```
⚠️ Finalise identified Definition of Done gaps.
Review the implementation report at {path} and address the gaps before re-running /finalise.
```

On success: log "Story accepted" in Decisions Log.

**Tracker Issue Update:**

Branch on `TRACKER`:

- **GitHub** (`TRACKER=github`): If `TRACKER_ISSUE` is set, explicitly close the issue and move the project board to Done:

   ```bash
   # 1. Post completion comment
   gh issue comment {TRACKER_ISSUE} --body "Story development complete — PR: {PR_URL}. Story status: Accepted. All DoD criteria verified."

   # 2. Close the issue
   gh issue close {TRACKER_ISSUE} --comment "Closing — story accepted and PR merged. Implementation report: {report-path}"
   ```

   After closing, verify the issue is actually closed:
   ```bash
   ISSUE_STATE=$(gh issue view {TRACKER_ISSUE} --json state -q '.state')
   if [ "$ISSUE_STATE" = "CLOSED" ]; then
     echo "✅ GitHub Issue #{TRACKER_ISSUE} confirmed closed"
   else
     echo "⚠️ GitHub Issue #{TRACKER_ISSUE} still open — state: $ISSUE_STATE"
   fi
   ```

   Then move the project board item to Done using the same GraphQL pattern from Phase 0c-reg, but with "Done" as the target option (not "In Progress"). If the board move fails, post a comment on the issue warning that the board was not updated.

   On any `gh issue close` failure: retry once. If still failing, log the error in the Issues Log and post a PR comment: "⚠️ Issue #{TRACKER_ISSUE} could not be closed automatically — please close manually."

   Log in Decisions Log: "GitHub Issue #{TRACKER_ISSUE} closed (state: {state}). Board: {Done ✅ / ⚠️ update failed}."

- **Jira** (`TRACKER=jira`): If `TRACKER_ISSUE` is set, use the Atlassian MCP tools to post a completion comment and transition to Done (`cloudId` derived from `JIRA_URL` hostname):

   1. **Post completion comment** — call `addCommentToJiraIssue`:
      - `issueIdOrKey`: `{TRACKER_ISSUE}`
      - `commentBody`: `"Story development complete — PR: {PR_URL}. Story status: Accepted."`
      - `contentFormat`: `"markdown"`
      - On failure: log warning and continue (non-blocking)

   2. **Transition to Done** — call `getTransitionsForJiraIssue` then `transitionJiraIssue`:
      - Find transition matching "Done" (case-insensitive); fallbacks: "Closed", "Resolved"
      - If found: call `transitionJiraIssue`; log "✅ Jira issue {TRACKER_ISSUE} transitioned to Done"
      - If not found: log "⚠️ No done-state transition available for {TRACKER_ISSUE}" (non-blocking)
      - On failure: log warning and continue

   Log in Decisions Log: "Jira issue {TRACKER_ISSUE} — completion comment posted; transitioned to Done."

Update Pipeline Progress: ✅ finalise.

Locate the DoD summary file created by finalise:

```bash
ls {story-directory}/story.{epic}.{story}.dod.*.md 2>/dev/null | sort | tail -1
```

Record its path in the Decisions Log: "DoD summary: {path}". Add it to the Completion section of the implementation report as **DoD Summary**: {path}.

### Step 8: Commit Changes

Before invoking `/commit-changes`, update the implementation report one final time:

- Set **Finished** timestamp
- Set **Final Status** to `Completed`
- Fill in **QA Iterations** count
- Ensure the Pipeline Progress table shows ✅ for all steps
- Write a **Completion Summary** paragraph: what was built, QA iterations taken, notable decisions

Then invoke the `/commit-changes` skill. The implementation report must be staged and included in this commit alongside any remaining uncommitted changes.

After `/commit-changes` completes, run `git log --oneline -1` to capture the final commit hash. Update the Pipeline Progress Notes for Step 8: `Committed in \`{hash}\``(and note the PR reference if applicable, e.g.`Committed in \`{hash}\`, merged via PR #{N}`).

Push the final commit so the PR reflects the completed implementation report and DoD summary:
```bash
git push origin HEAD
```

Update Pipeline Progress: ✅ commit-changes.

**Remove the pipeline lock file** (pipeline finished cleanly, no further pause possible):
```bash
rm -f .claude/state/develop-pipeline.lock
```

---

## Phase 2: Completion

Output the final status:

```
✅ Story Development Complete

Story:                 {story filename}
Branch:                {branch name}
PR:                    {PR URL}
QA Cycles:             {N}
Implementation Report: {report file path}

All pipeline steps completed successfully. The story is accepted and all changes committed.
```

For any other halt:

```
⚠️ Story Development Paused — Human Input Required

Story:                 {story filename}
Paused at:             Step {N} — {step name}
Reason:                {concise reason}
Implementation Report: {report file path}

The implementation report has a full account of what was completed and what needs attention.
```

---

## Autonomous Decision Defaults

Every default applied must be recorded in the Decisions Log.

| Situation                                                                         | Default                                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Feature branch base                                                               | User-selected in Upfront Setup (Q1)                                                    |
| PR target branch                                                                  | User-selected in Upfront Setup (Q2)                                                    |
| High-risk story gate                                                              | User-selected in Upfront Setup (Q3)                                                    |
| Story status is `Draft`                                                           | Step 2 runs `/review-story` to validate and promote autonomously                       |
| Story status is `Ready for Development` or `In Progress` AND review report exists | Step 2 skips `/review-story` — story already reviewed                                  |
| Story status is `Ready for Development` or `In Progress` AND no review report     | Step 2 runs `/review-story` — status set without completing a review                   |
| review-story output format                                                        | Always select "Comprehensive report" — pipeline requires co-located review report file |
| Draft status gate (develop)                                                       | Proceed — review-story already validated the story (or status was never Draft)         |
| Alignment mismatch (develop)                                                      | Align code to document — document is source of truth                                   |
| Commit style                                                                      | Conventional Commits                                                                   |
| Commit granularity                                                                | Multiple logical commits                                                               |
| Implementation report in create-pr commit                                         | EXCLUDE — unstage before create-pr commits; Step 8 commits it                          |
| Pre-develop codebase mapping                                                      | Always run Explore subagent; pass summary to /develop, do not re-read files            |
| qa-fix with no file changes                                                       | HALT — do not increment cycle; log as unfixable and surface to user                    |
| Resume state validation                                                           | Cross-check branch + PR existence before jumping to next step                          |
| Pipeline mode for simple stories                                                  | `lite` if risk_level low/absent + <3 Tasks + single module; otherwise `standard`       |
| qa-story invocation in lite mode                                                  | Prepend "Use direct tools only — skip parallel agents" to the invocation context       |
| Register not found at startup                                                     | Ask once via AskUserQuestion; defer creation to post-pipeline if Yes                   |
| Register found, story already ✅                                                  | HALT, AskUserQuestion to confirm re-run                                                |
| Register found, story ❌ or ⚡                                                    | Update to ⚡ at start; update to ✅ after Step 7                                       |
| Register update on completion                                                     | Stage with implementation report; include in Step 8 commit                             |
| Register references sequence doc (for creation)                                   | Use story-implementation-sequence.md if present; otherwise scan story files            |
| Final commit push (Step 8)                                                        | Always push after Step 8 commit so PR reflects completed report                        |

If a situation arises that is not in this table and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.

---

## Error Recovery Principles

- **Never silently continue past a failed step.** Every failure is logged and surfaced to the user.
- **Always use `/commit-changes` to commit** — never raw `git commit`. This ensures consistent commit quality, conventional messages, and proper staging.
- **Commit the report before any halt.** Invoke `/commit-changes` for the report before surfacing any HALT so the audit trail is in git even when the pipeline doesn't complete.
- **Push after every commit during the QA loop.** The PR must stay current with the local branch (`git push origin HEAD`).
- **The implementation report is the primary recovery tool.** Always include its path in halt messages.
- **Remove the lock file before every terminal HALT.** After committing the report (per the rule above), run `rm -f .claude/state/develop-pipeline.lock` so a future PreCompact firing in this same session won't try to commit again. The lock is recreated automatically when the user re-invokes `/develop-story` and the resume flow re-enters Step 1 (or the resume verification confirms it should remain past Step 1). The graceful-pause hook also removes the lock itself if it runs — this rule covers the non-hook halt paths.
- If a sub-skill cannot be found, log the error and tell the user to verify the skill is installed in `.agents/skills/`.

---

## File References

- Stories: co-located within epic directories — `docs/prd/<domain>/epics/epic.{N}.<name>/stories/`
- Story directory: `docs/prd/<domain>/epics/epic.{N}.<name>/stories/story.{epic}.{story}.{name}/`
- Story file: `story.{epic}.{story}.{name}.md`
- Implementation report: `story.{epic}.{story}.implementation.{N}.{descriptive-name}.md`
- Review report: `story.{epic}.{story}.review.{YYYY-MM-DD}.md` (generated by Step 2 `/review-story`)
- QA gate: `story.{epic}.{story}.gate.{N}.{name}.yml`
- QA report: `story.{epic}.{story}.qa.{N}.{name}.md`

## Related Skills

- `/create-branch` — Step 1
- `/review-story` — Step 2
- `/develop` — Step 3
- `/create-pr` — Step 4
- `/qa-story` — Step 5
- `/qa-fix` — Step 6
- `/finalise` — Step 7
- `/commit-changes` — Step 8

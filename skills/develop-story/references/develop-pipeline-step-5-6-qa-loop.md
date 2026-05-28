---
name: develop-pipeline-step-5-6-qa-loop
description: Steps 5–6 (QA loop) shared by develop-story and develop-task. Covers QA cycle counter setup, gate file location, qa-story/qa-task invocation (with lite mode directive), PASS/CONCERNS/FAIL branching, no-code-change HALT, qa-fix invocation, commit/push per cycle, escalation entry template, and loop limit HALT message. Story vs task variants called out where they differ (skill names, file patterns, gate sort field, commit message format, escalation text).
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-step-5-6-qa-loop.md. Regenerate via `npm run bundle`. -->

# Develop Pipeline — Steps 5–6: QA Loop

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Steps 5–6. Story/task variants are called out in labeled sub-sections where they differ.

---

## Loop Setup (shared)

This is the iterative heart of the pipeline. Maintain a **QA cycle counter** starting at 1. The loop limit is **5 complete cycles**. A clean PASS on any QA review exits the loop immediately.

#### develop-story
Each cycle = one `/qa-story` + one `/qa-fix`. A clean PASS on any qa-story exits the loop immediately.

#### develop-task
Each cycle = one `/qa-task` + one `/qa-fix`. A clean PASS on any qa-task review exits the loop immediately.

---

## Finding the Latest Gate File

Use a format-agnostic regex to extract the numeric `{N}` from each filename, sort numerically, and pick the highest. Robust to story/task names that contain dots.

#### develop-story
```bash
ls {story-directory}/story.{epic}.{story}.gate.*.yml 2>/dev/null \
  | awk -F'gate\\.' '{ split($2, a, "."); printf "%d\t%s\n", a[1], $0 }' \
  | sort -k1,1 -n | tail -1 | cut -f2-
```

#### develop-task
```bash
ls {task-directory}/task.{id}.gate.*.yml 2>/dev/null \
  | awk -F'gate\\.' '{ split($2, a, "."); printf "%d\t%s\n", a[1], $0 }' \
  | sort -k1,1 -n | tail -1 | cut -f2-
```

The gate file pattern is `…gate.{N}.{name}.yml` — the awk splits on `gate.`, takes the first `.`-delimited token from the right side as `{N}`. Names containing dots (e.g. `auth.v2`) no longer affect ordering.

**Note (tasks only)**: The legacy path `docs/qa/gates/tasks/` is deprecated. qa-task v2.0 co-locates gate files in the task directory alongside the task document.

Read the gate file to determine the gate result.

---

## Each Cycle

### 5a. Run QA Review

#### develop-story

**Pre-step: Dispatch traceability mapper (standard mode only)**

Before invoking `/qa-story`, dispatch the QA traceability mapper as an Explore subagent (see `references/qa-traceability-mapper-prompt.md` for the full execution protocol):

```
Agent(subagent_type="Explore", prompt="Run the QA traceability mapper (references/qa-traceability-mapper-prompt.md).
Inputs:
  STORY_FILE={story-file}
  STORY_DIR={story-directory}

Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation.")
```

`{story-file}` and `{story-directory}` are the story file path and story directory path resolved in Phase 0a.

After the subagent completes:
1. Confirm `{story-directory}/.summaries/qa-traceability-matrix.md` was written.
2. Write the summary JSON artifact to `{story-directory}/.summaries/step-5-traceability-mapper.json` (schema: `references/subagent-summary-artifact.md`).
3. Update the Pipeline Progress `Subagent summary ref` column for Step 5–6 with the JSON path.

If the subagent fails or the matrix file is absent: log warning in Issues Log and proceed without the matrix (qa-story falls back to internal mapping).

Skip this pre-step when any of:
- `PIPELINE_MODE=lite` — the mapper adds overhead that lite mode trades away.
- Story has **no Acceptance Criteria section** (`grep -ciE '^##+ +acceptance criteria' {story-file}` returns 0). Nothing to map.
- Story has **≤ 2 ACs** (count `^- ` or `^[0-9]+\.` lines under the AC heading). The mapper's overhead exceeds its value at this size; qa-story's internal mapping is sufficient.

Log the bypass reason in the Decisions Log (`Traceability mapper skipped: {reason}`).

**Invoke `/qa-story`**

Invoke the `/qa-story` skill with the story file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story is running in lite mode."

When the traceability matrix was successfully generated, pass its path via Skill args:

```
Skill(qa-story, args="traceability_matrix={story-directory}/.summaries/qa-traceability-matrix.md")
```

If the matrix was not generated (lite mode or mapper failure), invoke without the `traceability_matrix` arg — qa-story performs internal mapping as before.

#### develop-task

**Pre-step: Dispatch traceability mapper (standard mode + Success Criteria table only)**

Conditions to dispatch the mapper for tasks (all must be true):
1. `PIPELINE_MODE = standard` (lite mode skips the mapper)
2. `HAS_SUCCESS_CRITERIA_TABLE = true` (set by Phase 0a Agent 3 — the lite-mode/always-load detector)

If both are true, dispatch the mapper as an Explore subagent — same prompt as develop-story, but pass the **task** file/directory as the values for `STORY_FILE`/`STORY_DIR` (the mapper accepts both doc types — see `qa-traceability-mapper-prompt.md` "Doc type" note):

```
Agent(subagent_type="Explore", prompt="Run the QA traceability mapper (references/qa-traceability-mapper-prompt.md).
Inputs:
  STORY_FILE={task-file}
  STORY_DIR={task-directory}

Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation.")
```

After the subagent completes:
1. Confirm `{task-directory}/.summaries/qa-traceability-matrix.md` was written.
2. Write the summary JSON artifact to `{task-directory}/.summaries/step-5-traceability-mapper.json` (schema: `references/subagent-summary-artifact.md`).
3. Update the Pipeline Progress `Subagent summary ref` column for Step 5–6 with the JSON path.

If the subagent fails or the matrix file is absent: log warning in Issues Log and proceed without the matrix (qa-task falls back to its internal mapping).

Skip this pre-step when `PIPELINE_MODE=lite` OR `HAS_SUCCESS_CRITERIA_TABLE=false`. Tasks with no Success Criteria table (e.g. pure infra cleanup) gain nothing from the mapper.

**Invoke `/qa-task`**

Invoke the `/qa-task` skill with the task file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This task is running in lite mode."

When the traceability matrix was successfully generated, pass its path via Skill args:

```
Skill(qa-task, args="traceability_matrix={task-directory}/.summaries/qa-traceability-matrix.md")
```

If the matrix was not generated (lite mode, no Success Criteria table, or mapper failure), invoke without the `traceability_matrix` arg.

### Outcome branching (shared)

After completion, find and read the latest gate file:
- `PASS` with no `top_issues` → exit loop, proceed to Step 7
- `CONCERNS`, `FAIL`, or has `top_issues` → proceed to 5b

Log the result in the QA Iteration History section:

```
### QA Cycle {N} — {YYYY-MM-DD}
**Gate Result**: {PASS / CONCERNS / FAIL}
**Issues Found**: {count and brief descriptions, or "none"}
**Action**: {Proceeding to finalise / Running qa-fix (cycle N of 5)}
```

**Post QA cycle result to tracker issue** (non-blocking — skip if `TRACKER_ISSUE` is empty):

```bash
# GitHub
tracker_call_with_retry gh issue comment {TRACKER_ISSUE} --body "## 🔍 QA Cycle {N} — Gate: {PASS / CONCERNS / FAIL}

**Issues found**: {count, or 'none'}
{top 3 issues from gate file top_issues list, or 'No issues — proceeding to finalise'}
**Action**: {Proceeding to finalise / Running qa-fix (cycle {N} of 5)}"

# Jira — call addCommentToJiraIssue:
#   issueIdOrKey: {TRACKER_ISSUE}
#   commentBody: same markdown body above
#   contentFormat: "markdown"
```

On failure: log warning in Issues Log and continue. Log in Decisions Log: "QA cycle {N} result comment posted to {TRACKER} issue {TRACKER_ISSUE}."

### 5b. Run QA Fix (shared)

Invoke the `/qa-fix` skill with the path to the most recent **gate file** (the `.yml` file located using the sort command above). The gate file is the authoritative source of issues for qa-fix.

After fixes are applied:

0. **Check for actual changes**: Before committing, run `git diff --stat HEAD` to verify qa-fix actually modified files. If no files changed (qa-fix made no code edits), do NOT increment the cycle counter. Instead:
   - Log in Issues Log: "QA Cycle {N}: qa-fix made no code changes — issues may be unfixable with current approach"
   - HALT with: "qa-fix could not address the remaining issues. Human review required. See implementation report for details."

1. **Exclude the implementation report from this commit** — Step 8 owns the sole report commit, so qa-fix cycles must not bring report mutations into a `fix(...)` commit. Before invoking `/commit-changes`, unstage the report explicitly:

   ```bash
   # develop-story
   git reset HEAD -- '**/story.*.implementation.*.md' 2>/dev/null || true
   # develop-task
   git reset HEAD -- '**/task.*.implementation.*.md' 2>/dev/null || true
   ```

   Then invoke `/commit-changes` with an explicit `exclude` directive in the prompt: pass `exclude=story.{epic}.{story}.implementation.*.md` (or `task.{id}.implementation.*.md`). The skill respects the directive and will not re-stage the report.

   Conventional Commits message:

   #### develop-story
   `fix(story.{epic}.{story}): qa-fix cycle {N} — {brief summary of fixes}`

   #### develop-task
   `fix(task.{id}): qa-fix cycle {N} — {brief summary of fixes}`

   Rationale: previously the report was simply "not needed" in qa-fix commits but nothing prevented inclusion. Decisions Log / QA Iteration History entries written during the cycle would silently land in `fix(...)` commits, splitting report history across the branch. Step 8 is the single owner of the report commit (`docs(...)`).

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

4a. **Post QA fix summary to tracker issue** (non-blocking — skip if `TRACKER_ISSUE` is empty):

   ```bash
   # GitHub
   tracker_call_with_retry gh issue comment {TRACKER_ISSUE} --body "## 🔧 QA Fix Cycle {N} Applied — Step 6/8

   **Fixes applied**: {brief summary from qa-fix output}
   **Commit**: \`{hash}\`"

   # Jira — call addCommentToJiraIssue:
   #   issueIdOrKey: {TRACKER_ISSUE}
   #   commentBody: same markdown body above
   #   contentFormat: "markdown"
   ```

   On failure: log warning in Issues Log and continue. Log in Decisions Log: "QA fix cycle {N} comment posted to {TRACKER} issue {TRACKER_ISSUE}."

5. **Post-fix PR state check (uses tracker state poller)**: Invoke the tracker state poller (see `references/tracker-state-poller-subagent.md`) via an Explore subagent with `PR_NUMBER={PR_NUMBER}` and `ISSUE_KEY=` (empty).

   Persist the result to `{story-or-task-directory}/.summaries/step-5-post-fix-tracker-{N}.json` where `{N}` is the **current cycle number** (do NOT overwrite earlier cycles' artifacts — each cycle gets its own file). Schema per `references/subagent-summary-artifact.md`. Update the Pipeline Progress `Subagent summary ref` column for Step 5–6 with the latest path.

   Branch on `result.pr.state`:
   - `"OPEN"` → continue QA loop normally.
   - `"MERGED"` or `"CLOSED"` → HALT: "PR #{PR_NUMBER} was {state} mid-QA loop — pipeline cannot continue. Verify PR state and re-run if needed." Log in Issues Log.
   - `null` / missing / empty (poller succeeded but state field absent) → log warning `"⚠️ PR state unknown after qa-fix push — re-polling once"`; re-invoke the poller once. If the second result is still null/missing, log `"⚠️ PR state could not be determined — proceeding optimistically (treating as OPEN)"` in Issues Log and continue. Do **not** HALT on null — flaky `gh pr view` is more common than mid-loop close.
   - `result.errors | length > 0` → log each error in Issues Log; treat `pr.state` per the rules above (the poller may still return a usable state alongside non-fatal errors).

6. **Emit eval marker (EVAL_MODE guard)**: If the environment variable `EVAL_MODE=1` is set, write an empty marker file after each completed qa-fix iteration so eval harnesses can detect the iteration boundary and send a kill signal for resume testing:
   ```bash
   if [ "${EVAL_MODE}" = "1" ]; then
     mkdir -p .task-state
     touch ".task-state/qa-fix-iter-${QA_CYCLE}.marker"
   fi
   ```
   This is a no-op in all production runs where `EVAL_MODE` is unset.

7. Increment the cycle counter and return to 5a.

---

## Loop Limit Escalation (after 5 cycles without PASS)

Before halting, write a thorough escalation entry in the Issues Log:

#### develop-story escalation template

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

#### develop-task escalation template

```
### QA Loop Limit Reached — {YYYY-MM-DD}

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

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
infrastructure, success criteria that cannot be met with current approach}

**Recommended next steps**:
1. {Specific action}
2. {Specific action}
3. {Specific action — e.g., update task if issues reflect out-of-scope requirements}
```

Set report status to `Escalated`. Invoke the `/commit-changes` skill to commit the implementation report:

#### develop-story escalation commit
Suggested commit message: `docs(story.{epic}.{story}): implementation report — qa loop escalation`

#### develop-task escalation commit
Suggested commit message: `docs(task.{id}): implementation report — qa loop escalation`

Then push:
```bash
git push origin HEAD
```

#### develop-story HALT message

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

#### develop-task HALT message

```
⚠️ Task Development Paused — QA Loop Limit Reached

Task:                {task filename}
QA cycles completed: 5
Final gate status:   {status}
Implementation Report: {report file path}

The implementation report contains a full breakdown of every issue and fix attempted.
Options:
1. Fix remaining issues manually, then re-run /qa-task
2. Accept the current gate status and proceed manually with /finalise
3. Update the task requirements if issues reflect unintended scope
```

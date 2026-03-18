---
name: develop-task
description: Automates the full end-to-end task development lifecycle: create-branch → review-task → develop → create-pr → qa-task → qa-fix (iterative, up to 5 cycles) → finalise → commit-changes. Adapted from develop-story for standalone technical tasks (refactoring, infra, cleanup) in docs/development/tasks/. Features: Explore subagent for task resolution and pre-develop codebase mapping; context hygiene between steps; lite mode for low-risk tasks; resume with per-step artifact verification; optional task-register integration; `--base` branch pre-supplied to create-pr. Records all decisions in a co-located implementation report. Invoke with `/develop-task <task-file-path>` or "develop and QA this task end to end".
---

# Develop Task — Automated Lifecycle Orchestrator

This skill orchestrates the complete task development lifecycle, calling each skill in sequence and maintaining an implementation report that records every significant decision and issue encountered along the way.

## When to Use This Skill

- User says `/develop-task <path>` or passes a task file path
- User wants to run a technical task through the full automated pipeline without hand-holding each step
- User wants an audit trail of decisions made during task implementation

---

## Phase 0: Resolve & Prepare

### 0a. Resolve the task file

Accept any of:
- **Task file**: `docs/development/tasks/task.2.home-page-content-realignment/task.2.home-page-content-realignment.md`
- **Task directory**: `docs/development/tasks/task.2.home-page-content-realignment/`
- **Bare filename**: `task.2.home-page-content-realignment.md`

**Resolution using Explore subagent:**

Use the Agent tool with subagent_type="Explore" to locate the task file. Provide the input path and ask it to:
- Find the file matching `task.{id}.*.md` that does NOT contain `.qa.`, `.gate.`, `.bug.`, or `.implementation.` in its name
- Return only: the absolute file path and the task directory path

If the Explore subagent cannot find the file, HALT and ask the user to confirm the path.

Extract `{task_id}` from the pattern `task.{id}.{name}.md`.

### 0b. Check pipeline state — resume or restart?

Before asking any questions, check whether a previous run was started for this task:

```bash
git branch --list "feature/task.{id}.*"
gh pr list --head "feature/task.{id}.*" --json number,url,state 2>/dev/null
ls {task-directory}/task.{id}.implementation.*.md 2>/dev/null
```

**If a previous run is detected** (existing branch, PR, or implementation report):

Use the `AskUserQuestion` tool with:
- Question: "A previous pipeline run exists for this task. What would you like to do?"
- Options:
  - "Resume from last completed step" (Recommended) — continue from where the previous run left off
  - "Start fresh" — create a new implementation report (N+1) and restart from Step 1

If resuming: read the existing implementation report, identify the last ✅ step, and verify each completed step's artifact before skipping it. Skip upfront questions that are already recorded in the Decisions Log of the existing report.

**Resume artifact verification (CRITICAL — run before skipping any step)**:

For each step marked ✅ in the implementation report, verify the expected artifact exists. If verification fails, **do not skip the step** — re-run it and log: "Resume verification failed for Step {N} — artifact missing, re-running."

| Step | Artifact to verify |
|------|-------------------|
| 1. create-branch | `git branch --list "feature/task.{id}.*"` returns the branch |
| 3. develop | `git log --oneline {branch}` shows more than the initial commit (code was actually committed) |
| 4. create-pr | `gh pr view {PR-number} --json state` returns open or merged |
| 5–6. qa loop | Latest gate file exists: `ls docs/qa/gates/tasks/task.{id}.gate.*.yml 2>/dev/null` |
| 7. finalise | Task file `Status:` field reads `Completed` |

Steps 2 and 8 do not require artifact verification beyond reading the implementation report.

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

### 0c. Read the task for upfront context

Before asking questions, read the task file and note:
- Task title (for implementation report naming)
- `Status:` field — see autonomous handling rules below
- Risk Assessment section — overall risk level (High / Medium / Low / absent)

**Autonomous status handling:**

| Status | Action |
|--------|--------|
| `Planned` | Note it in the implementation report. Proceed — Step 2 (`/review-task`) will validate and update the status autonomously. Do NOT ask the user. |
| `Ready for Development` | Proceed normally |
| `In Progress` | Proceed normally |
| `Ready for Review` / `Completed` | HALT — task is already past development. Ask the user if they want to re-run or check the wrong task path. |
| `Cancelled` | HALT — task is cancelled. Report to user before proceeding. |
| Any other status | HALT — status is unexpected. Report to user before proceeding. |

**Lite mode detection**: After reading the task, evaluate whether all three conditions are met:
- Overall risk in Risk Assessment is "Low" or absent, AND
- Fewer than 3 implementation phases defined, AND
- Task touches a single module (single app or lib)

If all three conditions are met, set `PIPELINE_MODE=lite` and log it in the implementation report Pipeline Configuration table. In lite mode:
- Step 5 (qa-task) uses **Direct Tools only** (skips parallel agents regardless of the adaptive strategy decision)
- Step 5b (qa-fix) still runs if issues are found
- All other steps run unchanged

If any condition is not met, `PIPELINE_MODE=standard` (default, no change to behaviour).

### 0c-reg. Check Task Register (Optional)

Locate the task register:
```bash
ls docs/development/task-register.md 2>/dev/null
```

**If NOT found**: Log in Decisions Log: "No task register found at `docs/development/task-register.md` — skipping register integration." Continue to 0d.

**If found**:
Read it. Find the row for this task by matching the task ID.

- `✅ Completed` → HALT with AskUserQuestion: "Task {ID} is already ✅ in the register. Re-run anyway?" If confirmed, proceed and log.
- `⚡ In Progress` → Proceed, log "Task already In Progress in register".
- `❌ Not Started` → Proceed normally.

Update the row: change status to `⚡ In Progress`. Stage this change alongside the Step 1 stash/unstash cycle (restore it after `git stash pop` in Step 1).

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

- On `feature/task.{id}.*` and new task shares the same `{id}` prefix:
  - Question: "Detected a possible sub-task. Which branch should `feature/task.{id}.{name}` be based on?"
  - Options:
    - "feature/task.{id}.{current}" (Recommended) — groups sub-task with parent
    - "develop" — independent feature

- On unrelated `feature/*` branch:
  - Question: "Which branch should `feature/task.{id}.{name}` be based on?"
  - Options:
    - "develop" (Recommended) — standard Gitflow base
    - "feature/{current}" — only if this task depends on uncommitted work here

**Q2 — PR target branch:**

- Question: "Which branch should the pull request target?"
- Options:
  - "develop" (Recommended) — standard Gitflow
  - "feature/{parent-branch}" — if this is a sub-task
  - "Other" — specify a custom branch name

**Q3 — High-risk task gate (only include this question if Risk Assessment = HIGH overall risk):**

- Question: "This task is flagged with HIGH overall risk. The `/develop` skill will offer to run `/qa-planning` first. Should this pipeline skip that gate?"
- Options:
  - "Skip qa-planning" (Recommended) — proceed autonomously
  - "Pause at that gate" — let me decide when we get there

---

If the user selects "Other" for Q1 or Q2, follow up with a plain text request for the branch name before proceeding.

Store all answers. Do not ask again mid-pipeline.

### 0e. Create the implementation report

After gathering all answers, determine the implementation report number:
- Scan `{task-directory}` for files matching `task.{id}.implementation.*.md`
- Find the highest existing `N`; the new report is `N+1` (or `1` if none exist)
- Derive `{descriptive-name}`:
  - If N = 1: `{task-name}-initial-run`
  - If N > 1: append context based on why this is a new run, e.g. `{task-name}-post-escalation` or `{task-name}-retry-{N}`

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
| Task risk level | {risk level from Risk Assessment or not set} |
| Pipeline mode | {lite / standard} |

---

## Pipeline Progress

| Step | Status | Notes |
|------|--------|-------|
| 1. create-branch | ⏳ Pending | |
| 2. review-task | ⏳ Pending | |
| 3. develop | ⏳ Pending | |
| 4. create-pr | ⏳ Pending | |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | |
| 7. finalise | ⏳ Pending | |
| 8. commit-changes | ⏳ Pending | |

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

### 0f. Pre-flight summary

Print this to the user before any irreversible action:

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

---

## Phase 1: Pipeline Execution

### Context Compression Recovery (CRITICAL — read this first)

If context was compressed while this pipeline was running (i.e., the conversation was summarized and you are now resuming), the pipeline state **must** be recovered from the implementation report before taking any other action:

```bash
ls {task-directory}/task.{id}.implementation.*.md 2>/dev/null | sort | tail -1
```

1. Read the implementation report. Find the last ✅ step in the Pipeline Progress table.
2. Output immediately: "⚠️ Context recovery — last completed step: Step {N}. Resuming from Step {N+1}."
3. Continue from Step {N+1} — do NOT re-run completed steps, do NOT skip any pending steps.

**This recovery is mandatory even if the user did not explicitly re-invoke `/develop-task`.** If you are in a conversation where `develop-task` was previously running and context was then compressed, you are still the develop-task orchestrator and must complete all remaining steps. A context summary saying "next step: create-pr" does NOT mean the pipeline ends after create-pr — it means Step 4 is next, and Steps 5–8 still follow.

### Context Management Rule (CRITICAL)

After EVERY step completes, before moving to the next step:
1. Retain only: step outcome (pass/fail), key decisions made, file paths of artifacts produced
2. Release all intermediate file contents from active consideration — do not re-read files that were already processed unless specifically needed
3. Summarize the step result in ≤5 bullet points in the implementation report, then treat step as closed

This prevents context accumulation across the 8-step pipeline.

**Never stop between steps.** This pipeline runs hands-free from Step 1 to Step 8. Never output a "done" or "complete" message and stop unless a step explicitly results in HALT or the pipeline has reached Step 8. Completing Step 4 (create-pr) is NOT a terminal state — Step 5 must follow immediately.

**Step banners (required).** Before starting each step, output a visible banner:
```
═══ DEVELOP-TASK PIPELINE: STEP {N}/8 — {STEP-NAME} ═══
```
This creates persistent checkpoints that survive context compression and make the pipeline position unambiguous.

After each step: update the Pipeline Progress table (✅ Done / ❌ Failed / ⚠️ Needs Attention) and log any decisions or issues before moving on.

### Step 1: Create Branch

Before invoking `/create-branch`, stash the implementation report to ensure a clean working directory:
```bash
git stash push --include-untracked -m "develop-task: implementation report pre-branch" -- {implementation-report-path}
```

Invoke the `/create-branch` skill with the task file path.

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

**On failure**: Update Pipeline Progress ❌, log in Issues Log. **Do not commit the report** — no feature branch exists yet and committing on the base branch would pollute it. Save the report file to disk and tell the user its path so they can recover manually. Then HALT with the error details.

### Step 2: Review Task

**Gate check**: Re-read the task file's `Status:` field (captured in Phase 0). Then check for an existing review report:
```bash
ls {task-directory}/task.{id}.review.*.md 2>/dev/null | sort | tail -1
```

Apply these rules:

| Pre-review status | Review report exists? | Action |
|-------------------|-----------------------|--------|
| `Planned` | Either | Run `/review-task` — task needs validation and promotion |
| `Ready for Development` | Yes | **Skip** — task reviewed and report exists; log and proceed |
| `Ready for Development` | No | Run `/review-task` — status set without completing a review |
| `In Progress` | Yes | **Skip** — review already completed; log and proceed |
| `In Progress` | No | Run `/review-task` — task may have been marked In Progress without a proper review |

**If skipping (status non-Planned AND review report confirmed)**:
- Log in Decisions Log: "review-task skipped — task status is `{status}` and review report exists at `{path}`"
- Update Pipeline Progress: ✅ review-task (skipped — already reviewed)
- Proceed to Step 3

**If running review-task**:

Invoke the `/review-task` skill with the task file path.

**Output format gate**: When `/review-task` asks for output format, **always select "Comprehensive report"**. The pipeline requires a persisted review report co-located with the task file. Log this autonomous decision in the Decisions Log: "review-task output: Comprehensive report — required for pipeline audit trail".

After review-task completes, locate the generated review report:
```bash
ls {task-directory}/task.{id}.review.*.md 2>/dev/null | sort | tail -1
```
Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-task did not produce a review report file") but do not halt — continue to outcome detection.

**Autonomous Step 9 answer**: When `/review-task` asks "Have you completed fixes?" (its Step 9), autonomously answer **"Yes, fixes complete"** — this allows review-task to update the task status to `Ready for Development`. Log in Decisions Log: "review-task Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously."

**Detecting outcomes**: After review-task completes, re-read the task file and check the `Status:` field. Apply these autonomous rules:

| Post-review status | Action |
|--------------------|--------|
| `Ready for Development` | Proceed — clean pass or Planned promoted |
| `In Progress` | Proceed — acceptable intermediate state |
| `Planned` (unchanged) | review-task left it Planned — log as issue, HALT and report to user |
| Downgraded / unclear | HALT — report to user |

**Handling findings**:
- **Planned → Ready for Development** (task was Planned, review upgraded it): Log "Planned promoted to Ready for Development by review-task" in Decisions Log. Proceed autonomously — no user prompt needed.
- **Non-blocking suggestions** (minor wording, optional improvements made by review-task): Log as "Proceeding despite minor review suggestions: {list}" and continue
- **Clean pass** (task was already ready, no changes needed): Log "Task review passed" and continue
- **Blocking issues** (missing success criteria, conflicting specs, or status still `Planned` after review): Log each specifically in Issues Log, invoke `/commit-changes` to save the report (message: `docs(task.{id}): implementation report — review-task blocking halt`), then HALT with: "review-task could not resolve blocking issues — human input required before development can proceed"

Update Pipeline Progress: ✅ review-task

### Step 3: Develop

Invoke the `/develop` skill with the task file path.

**Pre-develop codebase mapping (CRITICAL for context efficiency):**

Before invoking `/develop`, use the Agent tool with subagent_type="Explore" to map the codebase surface for this task:
- Ask it to find: all files likely affected by the success criteria and implementation phases, existing patterns in the same module/layer, test file conventions for the affected areas, any files explicitly named in the task's implementation plan
- Return a compact summary: file path + 1-line description per file (max 20 files)

Pass this summary to the `/develop` skill as context. Do NOT read these files again in the main context — the summary is sufficient for `/develop` to make informed decisions.

Log the Explore summary in the Decisions Log: "Pre-develop surface map: {N} files identified in {affected modules}".

**Pass this summary to `/develop`**: When invoking `/develop`, present the Explore summary as initial context so `/develop` does NOT need to run its own independent file discovery. This prevents duplicate exploration. State explicitly: "Codebase surface map already completed — {summary}. Proceed directly to alignment analysis using this map."

**Handling the develop skill's internal gates**:

- **Draft/Planned status gate**: If develop asks "is this ready?", answer **Yes** and automatically select "Yes, ready to implement". Rationale: `/review-task` already validated the task in Step 2. Log in Decisions Log: "Planned/Draft gate auto-answered: Yes — review-task validation in Step 2 is sufficient."
- **High-risk gate** (Risk Assessment = HIGH): Use the Q3 answer from Upfront Setup. The `/develop` skill presents three options: "Run `/qa-planning` now", "Skip, I've already planned", "Skip, low actual risk". If Q3 = "Skip qa-planning", automatically select **"Skip, I've already planned"** and log it. If Q3 = "Pause at that gate", let the user respond interactively.
- **Alignment mismatch gate**: If develop finds existing code that differs from the task, automatically select "Align code to document" — the document is the source of truth. Log this in Decisions Log.

**Detecting completion**: After `/develop` returns, read the task file and check the `Status:` field:
- `In Progress` or `Ready for QA` or `Ready for Review` → success, continue
- `Completed` → success, continue — `/develop` calls `/finalise` internally when run directly; the pipeline's own Step 7 will re-run `/finalise` after QA regardless
- Any other status → treat as a halt; log the actual status in Issues Log

**PIPELINE CONTINUES IMMEDIATELY.** Do not pause after `/develop` completes. Proceed directly to Step 4.

Update Pipeline Progress: ✅ develop

**On halt**: Log the reason in Issues Log, invoke the `/commit-changes` skill to save the report (suggested message: `docs(task.{id}): implementation report — develop halt`), then HALT with the report path.

### Step 4: Create PR

Invoke the `/create-pr` skill passing `--base {Q2_answer}` (e.g., `/create-pr --base develop`). This pre-supplies the target branch via create-pr's Step 0, skipping the interactive prompt entirely. Do not wait for create-pr to ask — Q2 is already resolved.

**Important**: `create-pr` will automatically commit any uncommitted code changes before opening the PR. At this point the implementation report is partially complete (Steps 1–3 documented). **CRITICAL**: The implementation report file must NOT be included in create-pr's auto-commit. Before invoking create-pr, proactively unstage the report if it was staged:
```bash
git restore --staged {implementation-report-path} 2>/dev/null || true
```
After create-pr completes, verify the report was not committed by checking `git log -1 --name-only`. If it was included, note this in the Issues Log (it does not warrant a halt — the report will simply be updated again in Step 8 with a superseding commit).
The report will continue to be updated through Steps 5–8, and its final state will be captured in the dedicated Step 8 commit.

After the PR is created:
- Record the PR URL in the Decisions Log and in the **PR** field of the Completion section
- Update Pipeline Progress Notes: `PR #{N}: {url}` — e.g. `PR #108: https://github.com/org/repo/pull/108`
- Update Pipeline Progress: ✅ create-pr

**On failure**: Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(task.{id}): implementation report — create-pr failure`), push, then HALT.

**PIPELINE DOES NOT END HERE. Steps 5–8 are mandatory.** Output immediately:
```
═══ DEVELOP-TASK PIPELINE: STEP 4/8 COMPLETE ═══
PR created: {PR URL}
Proceeding to Step 5: QA Task Review — do not stop
```
Then continue directly to Step 5–6 without waiting for user input.

### Step 5–6: QA Task / Fix Loop

This is the iterative heart of the pipeline. Maintain a **QA cycle counter** starting at 1. The loop limit is **5 complete cycles** (each cycle = one qa-task + one qa-fix). A clean PASS on any qa-task review exits the loop immediately.

#### Finding the latest gate file

After each qa-task review, locate the most recent gate file:
```bash
ls docs/qa/gates/tasks/task.{id}.gate.*.yml | sort -t. -k4 -n | tail -1
```
The gate file pattern is `task.{id}.gate.{N}.{name}.yml` — field 4 (dot-delimited, with the full path prefix as field 1) is the numeric gate index. Read this file to determine the gate result.

#### Each cycle:

**5a. Run QA Task Review**

Invoke the `/qa-task` skill with the task file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This task is running in lite mode."

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

After fixes are applied:
0. **Check for actual changes**: Before committing, run `git diff --stat HEAD` to verify qa-fix actually modified files. If no files changed (qa-fix made no code edits), do NOT increment the cycle counter. Instead:
   - Log in Issues Log: "QA Cycle {N}: qa-fix made no code changes — issues may be unfixable with current approach"
   - HALT with: "qa-fix could not address the remaining issues. Human review required. See implementation report for details."
1. Invoke the `/commit-changes` skill to stage and commit the fix changes. The commit message should follow Conventional Commits: `fix(task.{id}): qa-fix cycle {N} — {brief summary of fixes}`. The implementation report does NOT need to be included in this commit — it will be finalised in Step 8.
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

Set report status to `Escalated`. Invoke the `/commit-changes` skill to commit the implementation report. Suggested commit message: `docs(task.{id}): implementation report — qa loop escalation`. Then push:
```bash
git push origin HEAD
```

HALT with:
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

### Step 7: Finalise

Invoke the `/finalise` skill with the task file path.

**Detecting completion**: After finalise returns, read the task file and check the `Status:` field:
- `Completed` → success, continue
- Any other status, or if finalise listed DoD gaps → halt

**If DoD gaps are found**: Log each gap with specific detail in Issues Log. Invoke the `/commit-changes` skill to commit the implementation report before halting so the audit trail is in git. Suggested commit message: `docs(task.{id}): implementation report — finalise gaps identified`. Then push:
```bash
git push origin HEAD
```

Then HALT:
```
⚠️ Finalise identified Definition of Done gaps.
Review the implementation report at {path} and address the gaps before re-running /finalise.
```

On success: log "Task completed" in Decisions Log.

**Register Update (if task register exists):**
If `docs/development/task-register.md` was found in Step 0c-reg:
1. Find the row matching this task's ID
2. Set Status column → `✅ Completed`
3. Set PR column → `#N` (PR number from Completion section)
4. Write the file
5. Stage for inclusion in Step 8 commit (do NOT commit separately)

Log in Decisions Log: "Register updated: task.{id} → ✅ Completed (PR #{N})"

Update Pipeline Progress: ✅ finalise.

Locate the DoD summary file created by finalise:
```bash
ls {task-directory}/task.{id}.dod.*.md 2>/dev/null | sort | tail -1
```
Record its path in the Decisions Log: "DoD summary: {path}". Add it to the Completion section of the implementation report as **DoD Summary**: {path}.

### Step 8: Commit Changes

Before invoking `/commit-changes`, update the implementation report one final time:
- Set **Finished** timestamp
- Set **Final Status** to `Completed`
- Fill in **QA Iterations** count
- Ensure the Pipeline Progress table shows ✅ for all steps
- Write a **Completion Summary** paragraph: what was implemented, QA iterations taken, notable decisions

Then invoke the `/commit-changes` skill. The implementation report must be staged and included in this commit alongside any remaining uncommitted changes.

After `/commit-changes` completes, run `git log --oneline -1` to capture the final commit hash. Update the Pipeline Progress Notes for Step 8: `Committed in \`{hash}\`` (and note the PR reference if applicable, e.g. `Committed in \`{hash}\`, merged via PR #{N}`).

Push the final commit so the PR reflects the completed implementation report and DoD summary:
```bash
git push origin HEAD
```

Update Pipeline Progress: ✅ commit-changes.

---

## Phase 2: Completion

Output the final status:

```
✅ Task Development Complete

Task:                  {task filename}
Branch:                {branch name}
PR:                    {PR URL}
QA Cycles:             {N}
Implementation Report: {report file path}

All pipeline steps completed successfully. The task is completed and all changes committed.
```

For any other halt:

```
⚠️ Task Development Paused — Human Input Required

Task:                  {task filename}
Paused at:             Step {N} — {step name}
Reason:                {concise reason}
Implementation Report: {report file path}

The implementation report has a full account of what was completed and what needs attention.
```

---

## Autonomous Decision Defaults

Every default applied must be recorded in the Decisions Log.

| Situation | Default |
|-----------|---------|
| Feature branch base | User-selected in Upfront Setup (Q1) |
| PR target branch | User-selected in Upfront Setup (Q2) |
| High-risk task gate | User-selected in Upfront Setup (Q3) |
| Task status is `Planned` | Proceed into Step 2 — `/review-task` will validate and promote autonomously |
| Task status `Ready for Development` or `In Progress` AND review report exists | Step 2 skips `/review-task` — task already reviewed |
| Task status `Ready for Development` or `In Progress` AND no review report | Step 2 runs `/review-task` — status set without completing a review |
| review-task output format | Always select "Comprehensive report" — pipeline requires co-located review report file |
| review-task Step 9 (fixes complete?) | Auto-answer "Yes, fixes complete" — pipeline proceeds autonomously |
| Draft/Planned status gate (develop) | Proceed — review-task already validated the task |
| Alignment mismatch (develop) | Align code to document — document is source of truth |
| Commit style | Conventional Commits |
| Commit granularity | Multiple logical commits |
| Implementation report in create-pr commit | EXCLUDE — unstage before create-pr commits; Step 8 commits it |
| Pre-develop codebase mapping | Always run Explore subagent; pass summary to /develop, do not re-read files |
| qa-fix with no file changes | HALT — do not increment cycle; log as unfixable and surface to user |
| Resume state validation | Per-step artifact verification before skipping any ✅ step |
| Pipeline mode for simple tasks | `lite` if risk Low/absent + <3 phases + single module; otherwise `standard` |
| qa-task invocation in lite mode | Prepend "Use direct tools only — skip parallel agents" to the invocation context |
| Completion status | `Completed` (tasks use Completed, not Accepted) |
| Task register not found | Skip silently — log in Decisions Log; no prompt needed |
| Task register found, task already ✅ | HALT, AskUserQuestion to confirm re-run |
| Task register found, task ❌ or ⚡ | Update to ⚡ at start; update to ✅ after Step 7; stage with Step 8 commit |
| Final commit push (Step 8) | Always push after Step 8 commit so PR reflects completed report |

If a situation arises that is not in this table and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.

---

## Error Recovery Principles

- **Never silently continue past a failed step.** Every failure is logged and surfaced to the user.
- **Always use `/commit-changes` to commit** — never raw `git commit`. This ensures consistent commit quality, conventional messages, and proper staging.
- **Commit the report before any halt.** Invoke `/commit-changes` for the report before surfacing any HALT so the audit trail is in git even when the pipeline doesn't complete.
- **Push after every commit during the QA loop.** The PR must stay current with the local branch (`git push origin HEAD`).
- **The implementation report is the primary recovery tool.** Always include its path in halt messages.
- If a sub-skill cannot be found, log the error and tell the user to verify the skill is installed in `.claude/skills/`.

---

## File References

- Tasks: `docs/development/tasks/task.{id}.{name}/`
- Task file: `task.{id}.{name}.md`
- Implementation report: `task.{id}.implementation.{N}.{descriptive-name}.md`
- Review report: `task.{id}.review.{YYYY-MM-DD}.md` (generated by Step 2 `/review-task`)
- QA gate: `docs/qa/gates/tasks/task.{id}.gate.{N}.{name}.yml`
- QA report: `task.{id}.qa.{N}.{name}.md` (co-located in task directory)
- DoD summary: `task.{id}.dod.{N}.{name}.md`

## Related Skills

- `/create-branch` — Step 1
- `/review-task` — Step 2
- `/develop` — Step 3
- `/create-pr` — Step 4
- `/qa-task` — Step 5
- `/qa-fix` — Step 6
- `/finalise` — Step 7
- `/commit-changes` — Step 8

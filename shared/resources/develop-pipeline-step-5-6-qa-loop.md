---
name: develop-pipeline-step-5-6-qa-loop
description: Steps 5–6 (QA loop) shared by develop-story and develop-task. Covers QA cycle counter setup, gate file location, qa-story/qa-task invocation (with lite mode directive), PASS/CONCERNS/FAIL branching, no-code-change HALT, qa-fix invocation, commit/push per cycle, escalation entry template, and loop limit HALT message. Story vs task variants called out where they differ (skill names, file patterns, gate sort field, commit message format, escalation text).
---

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

#### develop-story
```bash
ls {story-directory}/story.{epic}.{story}.gate.*.yml | sort -t. -k5 -n | tail -1
```
The gate file pattern is `story.{epic}.{story}.gate.{N}.{name}.yml` — field 5 (dot-delimited) is the numeric gate index.

#### develop-task
```bash
ls {task-directory}/task.{id}.gate.*.yml 2>/dev/null | sort -t. -k4 -n | tail -1
```
The gate file pattern is `task.{id}.gate.{N}.{name}.yml` — field 4 (dot-delimited) is the numeric gate index.

**Note (tasks only)**: The legacy path `docs/qa/gates/tasks/` is deprecated. qa-task v2.0 co-locates gate files in the task directory alongside the task document.

Read the gate file to determine the gate result.

---

## Each Cycle

### 5a. Run QA Review

#### develop-story
Invoke the `/qa-story` skill with the story file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story is running in lite mode."

#### develop-task
Invoke the `/qa-task` skill with the task file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This task is running in lite mode."

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

### 5b. Run QA Fix (shared)

Invoke the `/qa-fix` skill with the path to the most recent **gate file** (the `.yml` file located using the sort command above). The gate file is the authoritative source of issues for qa-fix.

After fixes are applied:

0. **Check for actual changes**: Before committing, run `git diff --stat HEAD` to verify qa-fix actually modified files. If no files changed (qa-fix made no code edits), do NOT increment the cycle counter. Instead:
   - Log in Issues Log: "QA Cycle {N}: qa-fix made no code changes — issues may be unfixable with current approach"
   - HALT with: "qa-fix could not address the remaining issues. Human review required. See implementation report for details."

1. Invoke the `/commit-changes` skill to stage and commit the fix changes using a Conventional Commits message:

   #### develop-story
   `fix(story.{epic}.{story}): qa-fix cycle {N} — {brief summary of fixes}`

   #### develop-task
   `fix(task.{id}): qa-fix cycle {N} — {brief summary of fixes}`

   The implementation report does NOT need to be included in this commit — it will be finalised in Step 8.

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

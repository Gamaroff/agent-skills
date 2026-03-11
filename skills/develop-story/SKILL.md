---
name: develop-story
description: Automates the full end-to-end story development lifecycle: create-branch → review-story → develop → create-pr → qa-review → qa-fix (iterative, up to 5 cycles) → finalise → commit-changes. Features: Explore subagent for story resolution and pre-develop codebase mapping; context hygiene between steps; lite mode for low-risk stories; resume from any step; `--base` branch pre-supplied to create-pr. Records all decisions in a co-located implementation report. Invoke with `/develop-story <story-file-path>` or "develop and QA this story end to end".
---

# Develop Story — Automated Lifecycle Orchestrator

This skill orchestrates the complete story development lifecycle, calling each skill in sequence and maintaining an implementation report that records every significant decision and issue encountered along the way.

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

**Resolution using Explore subagent:**

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

If resuming: read the existing implementation report, identify the last ✅ step, and jump to the next step. Skip upfront questions that are already recorded in the Decisions Log of the existing report.

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

**Autonomous status handling:**

| Status | Action |
|--------|--------|
| `Ready for Development` | Proceed normally |
| `In Progress` | Proceed normally |
| `Draft` | Note it in the implementation report. Proceed — Step 2 (`/review-story`) will validate and upgrade the status autonomously. Do NOT ask the user. |
| `Ready for Review`, `Accepted` | HALT — story is already past development. Ask the user if they want to re-run or check the wrong story path. |
| Any other status | HALT — status is unexpected. Report to user before proceeding. |

**Lite mode detection**: After reading the story, evaluate whether all three conditions are met:
- `risk_level: low` or absent, AND
- Fewer than 3 Tasks defined in the story, AND
- Story touches a single module (single app or lib)

If all three conditions are met, set `PIPELINE_MODE=lite` and log it in the implementation report Pipeline Configuration table. In lite mode:
- Step 5 (qa-review) uses **Direct Tools only** (skips parallel agents regardless of the adaptive strategy decision)
- Step 5b (qa-fix) still runs if issues are found
- All other steps run unchanged

If any condition is not met, `PIPELINE_MODE=standard` (default, no change to behaviour).

### 0c-reg. Check Global Register

Locate the story register:
```bash
ls docs/development/story-register.md 2>/dev/null
```

**If NOT found:**
Use `AskUserQuestion`:
- "No story register found at `docs/development/story-register.md`. Should one be created? It tracks global progress and enables automatic status updates."
- Options: "Yes, create after pipeline completes" | "No, skip register integration"

If Yes: log "Register creation deferred to post-pipeline" in Decisions Log. After Phase 2 Completion, derive the register from `docs/development/story-implementation-sequence.md` if it exists, or scaffold it from the story files. Then STOP — do not block the pipeline now.

**If found:**
Read it. Find the row for this story by matching the Story ID in column 2 (e.g. `| 29 | 12.3 |`).

- `✅ Completed` → HALT with AskUserQuestion: "Story {ID} is already ✅ in the register (PR: {PR}). Re-run anyway?" If confirmed, proceed and log.
- `⚡ In Progress` → Proceed, log "Story already In Progress in register".
- `❌ Not Started` → Proceed normally.

Check if the story's Dependencies column lists any stories still marked ❌. If so, log a **non-blocking** warning in Decisions Log: "Out-of-sequence: {N} listed dependency/ies not yet complete. Proceeding — user may have intentional reason."

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

| Setting | Value |
|---------|-------|
| Feature branch base | {Q1 answer} |
| PR target | {Q2 answer} |
| High-risk gate | {Q3 answer or N/A} |
| Story risk level | {risk_level value or not set} |
| Pipeline mode | {lite / standard} |

---

## Pipeline Progress

| Step | Status | Notes |
|------|--------|-------|
| 1. create-branch | ⏳ Pending | |
| 2. review-story | ⏳ Pending | |
| 3. develop | ⏳ Pending | |
| 4. create-pr | ⏳ Pending | |
| 5–6. qa-review / qa-fix loop | ⏳ Pending | |
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

### Context Management Rule (CRITICAL)

After EVERY step completes, before moving to the next step:
1. Retain only: step outcome (pass/fail), key decisions made, file paths of artifacts produced
2. Release all intermediate file contents from active consideration — do not re-read files that were already processed unless specifically needed
3. Summarize the step result in ≤5 bullet points in the implementation report, then treat step as closed

This prevents context accumulation across the 8-step pipeline.

After each step: update the Pipeline Progress table (✅ Done / ❌ Failed / ⚠️ Needs Attention) and log any decisions or issues before moving on.

### Step 1: Create Branch

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
- Update Pipeline Progress: ✅ create-branch

**On failure**: Update Pipeline Progress ❌, log in Issues Log. **Do not commit the report** — no feature branch exists yet and committing on the base branch would pollute it. Save the report file to disk and tell the user its path so they can recover manually. Then HALT with the error details.

### Step 2: Review Story

Invoke the `/review-story` skill with the story file path.

**Output format gate**: When `/review-story` asks "Would you like a comprehensive review report saved to a file, or just an actionable plan?" (Step 0 of that skill), **always select "Comprehensive report"**. The pipeline requires a persisted review report co-located with the story file. Do not select "Action plan only" — log this autonomous decision in the Decisions Log: "review-story output: Comprehensive report — required for pipeline audit trail".

After review-story completes, locate the generated review report:
```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```
Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-story did not produce a review report file") but do not halt — continue to outcome detection.

**Detecting outcomes**: After review-story completes, re-read the story file and check the `Status:` field. Apply these autonomous rules:

| Post-review status | Action |
|--------------------|--------|
| `Ready for Development` | Proceed — clean pass or draft promoted |
| `In Progress` | Proceed — acceptable intermediate state |
| `Draft` (unchanged) | review-story left it Draft — log as issue, HALT and report to user |
| Downgraded / unclear | HALT — report to user |

**Handling findings**:
- **Draft → Ready for Development** (story was Draft, review upgraded it): Log "Draft promoted to Ready for Development by review-story" in Decisions Log. Proceed autonomously — no user prompt needed.
- **Non-blocking suggestions** (minor wording, optional improvements made by review-story): Log as "Proceeding despite minor review suggestions: {list}" and continue
- **Clean pass** (story was already ready, no changes needed): Log "Story review passed" and continue
- **Blocking issues** (contradictory specs, missing acceptance criteria, or status still `Draft` after review): Log each specifically in Issues Log, invoke `/commit-changes` to save the report (message: `docs(story.{epic}.{story}): implementation report — review-story blocking halt`), then HALT with: "review-story could not resolve blocking issues — human input required before development can proceed"

Update Pipeline Progress: ✅ review-story

### Step 3: Develop

Invoke the `/develop` skill with the story file path.

**Pre-develop codebase mapping (CRITICAL for context efficiency):**

Before invoking `/develop`, use the Agent tool with subagent_type="Explore" to map the codebase surface for this story:
- Ask it to find: all files likely affected by the acceptance criteria, existing patterns in the same module/layer, test file conventions for the affected areas, any files explicitly named in the story's Dev Notes or Tasks
- Return a compact summary: file path + 1-line description per file (max 20 files)

Pass this summary to the `/develop` skill as context. Do NOT read these files again in the main context — the summary is sufficient for `/develop` to make informed decisions.

Log the Explore summary in the Decisions Log: "Pre-develop surface map: {N} files identified in {affected modules}".

**Pass this summary to `/develop`**: When invoking `/develop`, present the Explore summary as initial context so `/develop` does NOT need to run its own independent file discovery. This prevents duplicate exploration. State explicitly: "Codebase surface map already completed — {summary}. Proceed directly to alignment analysis using this map."

**Handling the develop skill's internal gates**:

- **Draft status gate**: If develop asks "is this draft ready?", answer **Yes** and automatically select "Yes, ready to implement". Rationale: `/review-story` already validated and promoted the story in Step 2 — the draft gate in `/develop` is redundant when called from this pipeline. Log in Decisions Log: "Draft gate auto-answered: Yes — review-story validation in Step 2 is sufficient."
- **High-risk gate** (`risk_level: high`): Use the Q3 answer from Upfront Setup. The `/develop` skill presents three options: "Run `/qa-planning` now", "Skip, I've already planned", "Skip, low actual risk". If Q3 = "Skip qa-planning", automatically select **"Skip, I've already planned"** and log it. If Q3 = "Pause at that gate", let the user respond to the develop prompt interactively. Note: develop also offers a third option "Skip, low actual risk" — if develop presents this option in the context where Q3 = "Skip qa-planning", treat it as equivalent to "Skip, I've already planned" and select it; do not surface the distinction to the user.
- **Alignment mismatch gate**: If develop finds existing code that differs from the story, automatically select "Align code to document" — the document is the source of truth. Log this in Decisions Log.

**Detecting completion**: After `/develop` returns, read the story file and check the `Status:` field:
- `Ready for Review` → success, continue
- Any other status → treat as a halt; log the actual status in Issues Log

Update Pipeline Progress: ✅ develop

**On halt**: Log the reason in Issues Log, invoke the `/commit-changes` skill to save the report (suggested message: `docs(story.{epic}.{story}): implementation report — develop halt`), then HALT with the report path.

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
- Update Pipeline Progress: ✅ create-pr

**On failure**: Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(story.{epic}.{story}): implementation report — create-pr failure`), push, then HALT.

### Step 5–6: QA Review / Fix Loop

This is the iterative heart of the pipeline. Maintain a **QA cycle counter** starting at 1. The loop limit is **5 complete cycles** (each cycle = one qa-review + one qa-fix). A clean PASS on any qa-review exits the loop immediately.

#### Finding the latest gate file

After each qa-review, locate the most recent gate file:
```bash
ls {story-directory}/story.{epic}.{story}.gate.*.yml | sort -t. -k5 -n | tail -1
```
The gate file pattern is `story.{epic}.{story}.gate.{N}.{name}.yml` — field 5 (dot-delimited) is the numeric gate index. Read this file to determine the gate result.

#### Each cycle:

**5a. Run QA Review**

Invoke the `/qa-review` skill with the story file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story is running in lite mode."

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
1. Invoke the `/commit-changes` skill to stage and commit the fix changes. The commit message should follow Conventional Commits: `fix(story.{epic}.{story}): qa-fix cycle {N} — {brief summary of fixes}`. The implementation report does NOT need to be included in this commit — it will be finalised in Step 8.
2. Push to the remote branch so the PR reflects the latest changes:
   ```bash
   git push origin HEAD
   ```
3. Log what was fixed in the QA Cycle entry:
   ```
   **Fixes Applied**: {brief description of what qa-fix changed}
   ```
4. Increment the cycle counter and return to 5a.

#### Loop limit escalation (after 5 cycles without PASS)

Before halting, write a thorough escalation entry in the Issues Log:

```
### QA Loop Limit Reached — {YYYY-MM-DD}

The pipeline completed 5 qa-review/qa-fix cycles without a clean PASS.

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
1. Fix remaining issues manually, then re-run /qa-review
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

**Register Update:**
If `docs/development/story-register.md` exists:
1. Find the row matching this story's ID
2. Set Status column → `✅ Completed`
3. Set PR column → `#N` (PR number from Completion section)
4. Write the file
5. Stage for inclusion in Step 8 commit (do NOT commit separately)

Log in Decisions Log: "Register updated: {ID} → ✅ Completed (PR #{N})"

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

Update Pipeline Progress: ✅ commit-changes.

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

| Situation | Default |
|-----------|---------|
| Feature branch base | User-selected in Upfront Setup (Q1) |
| PR target branch | User-selected in Upfront Setup (Q2) |
| High-risk story gate | User-selected in Upfront Setup (Q3) |
| Story status is `Draft` | Proceed into Step 2 — `/review-story` will validate and promote autonomously |
| review-story output format | Always select "Comprehensive report" — pipeline requires co-located review report file |
| Draft status gate (develop) | Proceed — review-story already validated the story |
| Alignment mismatch (develop) | Align code to document — document is source of truth |
| Commit style | Conventional Commits |
| Commit granularity | Multiple logical commits |
| Implementation report in create-pr commit | EXCLUDE — unstage before create-pr commits; Step 8 commits it |
| Pre-develop codebase mapping | Always run Explore subagent; pass summary to /develop, do not re-read files |
| qa-fix with no file changes | HALT — do not increment cycle; log as unfixable and surface to user |
| Resume state validation | Cross-check branch + PR existence before jumping to next step |
| Pipeline mode for simple stories | `lite` if risk_level low/absent + <3 Tasks + single module; otherwise `standard` |
| qa-review invocation in lite mode | Prepend "Use direct tools only — skip parallel agents" to the invocation context |
| Register not found at startup | Ask once via AskUserQuestion; defer creation to post-pipeline if Yes |
| Register found, story already ✅ | HALT, AskUserQuestion to confirm re-run |
| Register found, story ❌ or ⚡ | Update to ⚡ at start; update to ✅ after Step 7 |
| Register update on completion | Stage with implementation report; include in Step 8 commit |
| Register references sequence doc (for creation) | Use story-implementation-sequence.md if present; otherwise scan story files |

If a situation arises that is not in this table and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.

---

## Error Recovery Principles

- **Never silently continue past a failed step.** Every failure is logged and surfaced to the user.
- **Always use `/commit-changes` to commit** — never raw `git commit`. This ensures consistent commit quality, conventional messages, and proper staging.
- **Commit the report before any halt.** Invoke `/commit-changes` for the report before surfacing any HALT so the audit trail is in git even when the pipeline doesn't complete.
- **Push after every commit during the QA loop.** The PR must stay current with the local branch (`git push origin HEAD`).
- **The implementation report is the primary recovery tool.** Always include its path in halt messages.
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
- `/qa-review` — Step 5
- `/qa-fix` — Step 6
- `/finalise` — Step 7
- `/commit-changes` — Step 8

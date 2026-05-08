---
name: develop-pipeline-resume-contract
description: Resume verification contract shared by develop-story and develop-task. Covers per-step artifact verification, plan freshness check, MAX_ITER=5 stall semantics, QA cycle count reconstruction, and branch/PR cross-check. File naming patterns differ between story and task — both listed. Step 8 push command is a normal-flow concern (not a resume concern); it lives inline in each SKILL.md under the `### Step 8: Commit Changes` section.
---

# Develop Pipeline — Resume Verification Contract

## When This Contract Applies

This contract is invoked during Phase 0b of `/develop-story` or `/develop-task` when resuming a previous pipeline run. The orchestrator follows these steps to determine which steps are safe to skip (verified ✅) versus which must be re-run (missing artifact or ⏸️ Paused).

## Resume Artifact Verification (CRITICAL)

For each step marked ✅ in the implementation report, verify the expected artifact exists. If verification fails, **do not skip the step** — re-run it and log: "Resume verification failed for Step {N} — artifact missing, re-running."

A step marked `⏸️ Paused` (set by the PreCompact hook on graceful pause) is treated identically to `⏳ Pending`: re-run from the start of that step. Earlier `✅` steps still skip per their artifact verification. Log: "Resuming after graceful pause — re-running Step {N}."

Steps 2 and 8 do not require artifact verification beyond reading the implementation report.

### Subagent Summary Replay

For ✅ steps whose `Subagent summary ref` column points to a `.summaries/step-<N>-*.json` file, prefer reading the JSON summary over re-running the subagent or re-reading the source artifacts the subagent consumed. This is the resume-side counterpart to the on-disk persistence convention in `shared/resources/subagent-summary-artifact.md`. If the JSON file is absent (in-flight pipeline started before the convention existed) or fails `jq -e '.schema_version == 1'`, fall back to the implementation report's textual notes for that step. Do NOT re-dispatch the subagent on resume just to repopulate the summary — the step is already ✅ and re-running is wasted work.

### develop-story artifact table

| Step | Artifact to verify | Verification command |
| ---- | ------------------ | -------------------- |
| 1. create-branch | Branch exists in git | `git branch --list "feature/story.{epic}.{story}.*"` returns the branch |
| 3. develop | All tasks complete | Story file `Status:` field reads `Ready for Review` |
| 4. create-pr | PR exists | `gh pr view {PR-number} --json state` returns open or merged |
| 5–6. qa loop | **Both** `story.{epic}.{story}.qa.{N}.*.md` **and** `story.{epic}.{story}.gate.{N}.*.yml` exist **and** PR comment posted | `ls {story-directory}/story.*.qa.*.md` AND `ls {story-directory}/story.*.gate.*.yml` AND `gh pr view {PR} --comments --json comments \| grep -i "QA"` — gate alone is insufficient |
| 7. finalise | **All three**: `story.{epic}.{story}.dod.{N}.*.md` exists **and** story `status:` reads `accepted` **and** finalise acceptance comment posted to PR | `ls {story-directory}/story.*.dod.*.md` AND `grep -iE "^status:\s*accepted" {story-file}` AND `gh pr view {PR} --comments --json comments \| grep -i "accepted"` |

### develop-task artifact table

| Step | Artifact to verify | Verification command |
|------|-------------------|---------------------|
| 1. create-branch | Branch exists in git | `git branch --list "feature/task.{id}.*"` returns the branch |
| 3. develop | All phases complete | Task file `Status:` field reads `Ready for Review` |
| 4. create-pr | PR exists | `gh pr view {PR-number} --json state` returns open or merged |
| 5–6. qa loop | **Both** `task.{id}.qa.{N}.*.md` **and** `task.{id}.gate.{N}.*.yml` exist **and** PR comment posted | `ls {task-directory}/task.{id}.qa.*.md` AND `ls {task-directory}/task.{id}.gate.*.yml` AND `gh pr view {PR} --comments --json comments \| grep -i "QA"` — gate alone is insufficient |
| 7. finalise | **All three**: `task.{id}.dod.{N}.*.md` exists **and** task `status:` reads `accepted` **and** finalise acceptance comment posted to PR | `ls {task-directory}/task.{id}.dod.*.md` AND `grep -iE "^status:\s*accepted" {task-file}` AND `gh pr view {PR} --comments --json comments \| grep -i "accepted"` |

## Plan Freshness (Step 3 Prerequisite)

If the Decisions Log records a plan file from a prior session and Step 3 is being resumed, verify the plan file is at least as fresh as the story/task file:

```bash
# develop-story (macOS/Linux portable):
_mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1"; }
plan=$(ls {story-directory}/story.{epic}.{story}.plan.*.md 2>/dev/null | head -1)
[ -n "$plan" ] && [ "$(_mtime "$plan")" -ge "$(_mtime {story-file})" ]

# develop-task (macOS/Linux portable):
plan=$(ls {task-directory}/task.{id}.plan.*.md 2>/dev/null | head -1)
[ -n "$plan" ] && [ "$(_mtime "$plan")" -ge "$(_mtime {task-file})" ]
```

If the plan is stale (older than the story/task file), do **not** reuse it — drop the cached "Pre-develop surface map:" entry from the in-memory resume context, re-run the Explore subagent, and re-discover the plan file. Log: "Plan file stale on resume (mtime < story/task mtime) — re-running pre-develop discovery." Cap re-discovery at **1 retry per resume** to prevent loops; if the plan is still stale after the retry, proceed with the latest plan and log a warning. If no plan file exists in the directory, the freshness check is a no-op.

## Gate File Conflation Warning (CRITICAL)

A `gate.yml` written manually (without running the QA skill) does NOT satisfy Step 5–6. The required artifacts are the `qa.N.md` report file (created by `/qa-story` or `/qa-task`) AND the `gate.N.yml`. Similarly, updating DoD checkboxes in the story/task doc does NOT satisfy Step 7 — `/finalise` must write a separate `dod.N.md` file AND post an acceptance comment to the PR.

## QA Cycle Count Reconstruction (if resuming at Step 5–6)

If the last completed step was within the QA loop, count the number of `### QA Cycle` entries in the QA Iteration History section of the implementation report:

```bash
grep -c "^### QA Cycle" {implementation-report-path}
```

Set the cycle counter to this value before re-entering the loop. This ensures the 5-cycle limit is respected across resumes.

## Branch and PR Cross-Check

Cross-check the recorded pipeline state against current reality before resuming:

```bash
# Verify branch still exists
git branch --list "$(grep 'Branch:' {implementation-report} | awk '{print $2}')"
# Verify PR still exists
gh pr view "$(grep 'PR:' {implementation-report} | awk '{print $2}')" --json state 2>/dev/null
```

If the branch or PR no longer matches, warn the user before proceeding: "Pipeline state has diverged — recorded branch/PR may differ from current state. Proceeding anyway."

## Develop Loop — Stall Semantics and MAX_ITER Bound

Before iteration 1: count **any** `[x]` checkbox in the story/task file regardless of indent (top-level Tasks/phases AND nested subtasks/sub-steps both count as progress signal). Record `INITIAL_COMPLETED`. Count total checkboxes (`[ ]` + `[x]`, any indent) as `M`. Capture `LAST_COMMIT_HASH=$(git rev-parse HEAD)`. Set `ITER=1`, `MAX_ITER=5`, `LAST_COMPLETED=INITIAL_COMPLETED`.

```bash
# Count any checked box (top-level or nested):
grep -cE '\[x\]' {story-or-task-file}
# Count total checkboxes:
grep -cE '\[[ x]\]' {story-or-task-file}
```

**Progress is made if EITHER `CURRENT_COMPLETED > LAST_COMPLETED` OR `CURRENT_COMMIT_HASH != LAST_COMMIT_HASH`** (a new commit on the branch counts as progress even if no checkbox ticked, e.g. when only subtask work or test fixes were committed).

- **No progress** (both equal): HALT. Log: "Step 3 stall: /develop returned `In Progress` without ticking a checkbox or producing a new commit (iteration {ITER}, {CURRENT_COMPLETED}/{M})". Set report status to `Escalated` and HALT.
- **`ITER >= MAX_ITER`**: iteration cap reached — HALT. Log: "Step 3 hit MAX_ITER={MAX_ITER} without reaching `Ready for Review` ({CURRENT_COMPLETED}/{M} ticks). Manual intervention required."
- **Otherwise**: log "Step 3 iteration {ITER}: {CURRENT_COMPLETED}/{M} ticks complete (commit-progress: {yes/no}). Re-invoking /develop." Set `LAST_COMPLETED=CURRENT_COMPLETED`, `LAST_COMMIT_HASH=CURRENT_COMMIT_HASH`, increment `ITER`.

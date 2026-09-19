# Bug Report: Task 124 - A re-invoked resume (Phase 0b 'Resume from last completed step') never restores the lock — every advance now exits 1

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 2 (refute pass), code review finding CR-

## Description
`advance-pipeline-lock.sh <n>` with no lock now exits 1 (Phase 4). `--restore` is instructed only for the in-session continuation (Context Compression Recovery Step 0-lock; the resume contract's 'Continuing in the same session'). The re-invocation path — `/develop-task <path>` → Phase 0b → 'Resume from last completed step' — skips Step 1, the lock's only ordinary writer, and has no restore step; a resumed run at step ≥ 2 fails at its first Bash → Edit → banner transition and runs with an inert Stop hook until then. Before this task the same path was silently lockless (obs #123); now it is loudly lockless, which is better, but it is still not restored.

## Steps to Reproduce
HALT a run at step 5; re-invoke `/develop-task <path>`; choose Resume; the first `advance-pipeline-lock.sh 6` prints 'no lock … --restore' and exits 1.

## Expected Behavior
Phase 0b's resume branch runs `advance-pipeline-lock.sh --restore {doc-directory}` when the detector's source is `halt_snapshot` or `orphaned_claim` and the operator chooses Resume, before any step runs.

## Actual Behavior
No restore on the re-invocation path.

## Impact
Every re-invoked resume — the common case — is blocked at the first lock advance.

## Recommendation
Add the `--restore` call to step-0 §0b Shared Resume Logic, the resume contract's Phase 0b, and the three orchestrators' Phase 0b prose; reword the pause doc so 'rather than re-invoking the skill' does not imply re-invocation restores the lock.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
Phase 4 stated the restore for the in-session continuation only; the re-invocation resume (Phase 0b Resume) also skips Step 1 and was left with the same gap, now loud.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
`advance-pipeline-lock.sh --restore {doc-directory}` is stated in step-0 §0b Shared Resume Logic (run when the detector's source is halt_snapshot / orphaned_claim and the operator chooses Resume, before Phase 0b verification), in the resume contract (a new 'Restore the lock (both resume paths)' section under Phase 0a, and the Phase 0b paragraph now covers both paths), in the pause doc's Restored bullet, and in the three orchestrators' Step 0-lock paragraph.

**Files Modified**:
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-resume-contract.md`, `develop-pipeline-pause.md`
- `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`

**Testing**:
- fixtures 13 and 15 already record 'Lock restored … via --restore'; fast gate green

**Verification Steps for QA**:
1. `grep -n -- '--restore' shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` → the Shared Resume Logic block
2. HALT a run at step 5; re-invoke; choose Resume → the Decisions Log reads 'Lock restored from halt_snapshot via --restore at step 5' and the first advance succeeds

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
| 2026-09-19 | Closed | QA Engineer | Verified fixed in QA cycle 3 |

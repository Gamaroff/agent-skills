# Bug Report: Task 124 - develop-bug's Step 0-lock carries the grant-restores exception, but develop-bug has no grant prompt

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 4 (narrowed), code review finding CR-2

## Description
The cycle-3 exception ('except on a `loop-limit|not-converging` snapshot, where the grant restores') was applied to all three orchestrators. `develop-bug` has no re-entry grant — the resume contract's Re-entry step 3 places the prompt in develop-task and develop-story only, and develop-bug's Phase 0b and verify-loop escalation never offer one. A bug snapshot whose free-text `halt_reason` reads loop-limit would then be restored by neither path and the resume would fail at its first numeric advance.

## Steps to Reproduce
HALT a develop-bug run with halt_reason 'loop-limit'; re-invoke; choose Resume → no restore; first advance exits 1.

## Expected Behavior
develop-bug runs `--restore` on every halt snapshot; the exception exists only where a grant exists.

## Actual Behavior
The exception is stated where no grant can honour it.

## Impact
An enumeration-risk fix (same edit at three sites) applied where one site's precondition does not hold.

## Recommendation
Drop the exception from develop-bug's Step 0-lock and state that develop-bug's verify loop has no re-entry grant, so `--restore` runs on every snapshot.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The cycle-3 grant-exception sentence was applied to all three orchestrators as one enumeration-safe edit, but `develop-bug`'s verify loop has no re-entry grant prompt — the precondition the exception describes never holds there, so the sentence pointed a develop-bug resume at a restore that nothing would perform.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
`skills/develop-bug/SKILL.md` Step 0-lock no longer carries the `loop-limit|not-converging` exception. It states that develop-bug has no re-entry grant (the grant prompt lives in develop-task and develop-story only, resume contract Re-entry step 3), so `--restore` runs on every halt snapshot regardless of `halt_reason`.

**Files Modified**:
- `skills/develop-bug/SKILL.md`

**Testing**:
- prose; `grep -c 'loop-limit|not-converging' skills/develop-bug/SKILL.md` → 0; `npm run ci:fast` 3512 tests, 0 fail

**Verification Steps for QA**:
1. `grep -n 'no re-entry grant' skills/develop-bug/SKILL.md` → the Step 0-lock paragraph
2. `grep -n 'loop-limit|not-converging' skills/develop-bug/SKILL.md` → no match; the same grep on `skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md` still matches (the exception is kept where the grant exists)

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 4 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |
| 2026-09-19 | Closed | QA Engineer | Verified fixed in QA cycle 5 |

# Bug Report: Task 124 - The finalise CI-poll wait is marked with a 10-minute budget but the poll runs up to 25 minutes

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 1, code review finding CR-2

## Description
`skills/finalise/SKILL.md` marks the Step 7 reading-2 CI poll with `set-waiting-on.sh "step-7 CI poll (reading 2)" --kind task`, whose budget is `subagents.wallClockMinutes` (default 10). The poll it protects is bounded by `FINALISE_CI_MAX_WAIT` (1500 s). For the last 15 minutes of a legitimate wait the Stop hook re-prompts exactly as before task.124, and the hooks doc now tells the operator a re-prompt on a marked wait means the dispatch died.

## Steps to Reproduce
Run /finalise on a repository whose CI lane takes > 10 minutes; observe the Stop hook re-prompting from minute 10 while the poll is still alive.

## Expected Behavior
The mark outlives the wait it covers: the budget for a `--kind task` wait is the poll's own bound.

## Actual Behavior
The mark expires at 10 minutes; a 25-minute poll is re-prompted as a stall for 15 of them.

## Impact
Recreates obs #89 for exactly the longest wait in the pipeline, and the new documentation misattributes the re-prompt to a crash.

## Recommendation
Add an optional `--budget-minutes N` to `set-waiting-on.sh` (validated positive integer, overrides the config value) and pass `$((FINALISE_CI_MAX_WAIT / 60 + 1))` at the finalise site; test the override in `set-waiting-on.test.sh`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The writer had one budget source (`subagents.wallClockMinutes`) and the finalise CI poll's bound (`FINALISE_CI_MAX_WAIT`, 1500 s) is a different, longer number known only to the caller.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
`set-waiting-on.sh` gains `--budget-minutes N` (positive integer, no leading zero; anything else is a usage error, never a silent fallback). The finalise site passes `$(( ${FINALISE_CI_MAX_WAIT:-1500} / 60 + 1 ))`. The hooks doc documents the flag and the rule (a mark shorter than the wait it covers re-prompts the tail of every legitimate wait).

**Files Modified**:
- `shared/resources/set-waiting-on.sh`, `set-waiting-on.test.sh` (+2 assertions)
- `skills/finalise/SKILL.md` (CI poll site)
- `shared/resources/develop-pipeline-hooks.md`, `CHANGELOG.md`, task doc §6

**Testing**:
- `set-waiting-on.test.sh` 19/19: override stored as a number (26 over a configured 25); 0, 07, ten, -5 and empty refused with the lock byte-identical

**Verification Steps for QA**:
1. `PIPELINE_LOCK=<lock> bash shared/resources/set-waiting-on.sh x --kind task --budget-minutes 26` → `budget_minutes: 26` on the lock
2. `grep -n 'budget-minutes' skills/finalise/SKILL.md` → the CI-poll mark passes the poll bound

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |

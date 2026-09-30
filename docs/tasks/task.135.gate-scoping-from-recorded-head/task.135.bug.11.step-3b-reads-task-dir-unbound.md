# Bug Report: Task 135 - Step 3b binds $LATEST_GATE from an unchecked $TASK_DIR

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe, CR3-3)
**Date Found**: 2026-09-30

## Description
The Step 3b preamble runs `qa-cycle.sh "$TASK_DIR" --path gate` and `find "$TASK_DIR" …`. Unbound, `PRIOR_GATES` is 0 and every cycle takes the first-review branch: no refute, no scope, and neither new HALT can be reached. Same for `$STORY_DIR`.

## Recommendation
HALT in the preamble when the work-item directory is not a directory; executed test with it unset.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Step 3b preambles HALT when `$TASK_DIR` / `$STORY_DIR` is not a directory, before `find` or `qa-cycle.sh` read it. Test J4 executes the whole fence with a stub `gh`; mutation M19 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 3 |

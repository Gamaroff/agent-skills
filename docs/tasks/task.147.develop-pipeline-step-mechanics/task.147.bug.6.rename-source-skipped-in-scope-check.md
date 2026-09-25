# Bug Report: Task 147 - verify-push-state --scope ignores the source side of a rename

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, QA-1 (and CR-10))
**Date Found**: 2026-09-25

## Description

For an R/C porcelain entry the parser skips the source path and judges the entry by its destination alone.

**Location**: shared/resources/verify-push-state.sh (scoped check 3)

## Steps to Reproduce

`git mv docs/tasks/task.1/move.md moved-out.md` in a pushed branch, then `verify-push-state.sh --base main --scope docs/tasks/task.1`, under bash 5 and /bin/bash 3.2.

## Expected Behavior

Exit 1: a file is pending removal from the work item.

## Actual Behavior

Exit 0 with `! outside scope (warning): moved-out.md` and `clean within scope`.

## Impact

Uncommitted work inside the scope passes the check that exists to catch uncommitted work.

## Recommendation

Count a rename or copy as inside when either path is inside the scope. Add inside→outside and outside→inside cases to verify-push-state.test.sh.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: With -z porcelain, a rename is the destination entry followed by a separate source entry, and the parser skipped the source.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: Scoped check 3 now judges the source path as well. A source inside the scope is listed as `<path> (moved or copied away)` and fails the check.

**Files Modified**: shared/resources/verify-push-state.sh; shared/resources/verify-push-state.test.sh

**Testing**: Cases 14 (inside → outside, exit 1, source named) and 15 (outside → inside, exit 1). Mutation: removing the source classification turns case 14 red. Runs under bash 5 and /bin/bash 3.2.

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 1                              |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started                   |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved     |

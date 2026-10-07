# Bug Report: Task 172 - The combined-status read is not paginated

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-9
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; confirmed in source)
**Date Found**: 2026-10-01

## Description

The check-runs read uses --paginate and the commit status read does not; GitHub returns 30 statuses per page, so a failing status beyond the 30th is dropped and an ancestor reads SUCCESS. Confirmed in the source (no --paginate on the /status call).

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Add --paginate to the status call.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: the commit status read now passes `--paginate`, like the check-runs read. Test: both reads carry `--paginate`. Mutation proof G6.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

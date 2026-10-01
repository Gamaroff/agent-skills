# Bug Report: Task 172 - checkCommand has no timeout and stalls the 6c poll

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-10
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; confirmed in source)
**Date Found**: 2026-10-01

## Description

spawnSync of checkCommand has no timeout and the 6c poll runs it inside decided(). A hung check stalls the poll past FINALISE_CI_MAX_WAIT and writes no result. Confirmed in the source.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Add ci.docsOnly.checkTimeoutSeconds (default 1500) and map a timeout to check-failed.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: new key `ci.docsOnly.checkTimeoutSeconds` (positive integer, default 1500, matching `FINALISE_CI_MAX_WAIT`); the check is killed with SIGKILL at that bound and the finding is `check-failed` ("timed out after Ns"). Tests: a `sleep 20` check with a 1 s bound ends in under 10 s; non-positive and non-integer values are usage errors. Mutation proof G7.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

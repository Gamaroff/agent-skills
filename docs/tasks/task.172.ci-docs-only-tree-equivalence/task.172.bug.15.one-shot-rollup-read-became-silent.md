# Bug Report: Task 172 - The one-shot rollup read now assigns CI_ROLLUP silently, so the next block cannot re-bind it

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-15
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; confirmed in source)
**Date Found**: 2026-10-01

## Description

In develop-next and develop-batch the read became `CI_ROLLUP=$(...)`, printing nothing; the next fenced block reads `${CI_ROLLUP:?}` with no writer in that block, so the agent never sees the value it must bind. It also breaks the claim that enabled:false restores the old wait byte for byte.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

Echo the value after the assignment in both blocks.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: both blocks now print the value (`echo "CI rollup: $CI_ROLLUP"`) after the assignment, so the agent sees what the next block must re-bind.

Test: a pin on both files for the assignment followed by the echo. Mutation proof H4.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

# Bug Report: Task 172 - checkCommand and the config run in the working tree, not at the head judged

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; reproduced by QA)
**Date Found**: 2026-10-01

## Description

With --head set to a commit other than the checked-out HEAD the engine still reads the working-tree config and runs checkCommand there. Reproduced: --head c2 while HEAD is c3 returns tree-equivalent, exit 0, and the check ran against c3. The 6c poll runs across turns and passes --head $EXPECTED_HEAD.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Return unverifiable when the resolved --head is not the checked-out HEAD of the workspace root.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause (repeat subject of cycle 1's CR-1): the configuration and `checkCommand` apply to the working tree, but `--head` could name any commit. Move: consolidate, one rule.

Fix: `--head` must be the checked-out `HEAD` of the repository root; otherwise the answer is `unverifiable` and no check runs. Tests: refused for another commit with the check not run, accepted as a full sha of HEAD. Mutation proof G3.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

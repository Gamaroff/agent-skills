# Bug Report: Task 147 - A failed remote delete after a successful merge makes the merge block exit non-zero

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, CR-5)
**Date Found**: 2026-09-25

## Description

On the dirty-tree path the block ends with `git push origin --delete "$HEAD_BRANCH"`, whose status becomes the block status.

**Location**: skills/develop-batch/SKILL.md, skills/develop-next/SKILL.md

## Steps to Reproduce

Dirty tree, a merge stub that succeeds, and origin with no `feature/x` (GitHub auto-deleted it).

## Expected Behavior

Exit 0: the merge happened.

## Actual Behavior

Exit 1 after one successful merge call. develop-batch marks the item halted, and develop-next never sets `merged: true`.

## Impact

A merged PR is reported as unmerged, and a resume may try to merge it again.

## Recommendation

Make the delete non-fatal and reported separately (`… || echo "warn: remote branch not deleted"`), and add an already-deleted fixture.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The block's last command was the remote delete, so its status became the block's status.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: At both sites a failed remote delete now prints a warning and the block keeps the merge's status.

**Files Modified**: skills/develop-next/SKILL.md; skills/develop-batch/SKILL.md; shared/resources/tests/merge-delete-branch-guard.test.mjs

**Testing**: New case: origin already lacks the branch, one merge call succeeds, and the block exits 0 with a "not deleted" warning. Mutation: removing the `|| echo` turns it red.

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 1                              |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started                   |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved     |

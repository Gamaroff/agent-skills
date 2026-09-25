# Bug Report: Task 147 - A failed develop-next merge on a dirty tree deletes the unmerged PR head branch

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, CR-1)
**Date Found**: 2026-09-25

## Description

`HALT` is prose in develop-next, not a shell function. The new guard writes `[ -n "$HEAD_BRANCH" ] || HALT` and `gh pr merge … || HALT`, and run as shipped each `HALT` prints "command not found" (exit 127) and execution continues.

**Location**: skills/develop-next/SKILL.md (the `else` arm of the Step 3 merge block)

## Steps to Reproduce

Run the block with `VCS=github PR_ID=7 mergeStrategy=squash` and a `gh` stub whose `pr merge` exits 1, on a dirty tree, with origin holding `feature/x` (see `repro.mjs` in the QA report).

## Expected Behavior

The merge failure halts the block, and origin still holds the PR head branch.

## Actual Behavior

The block exits 0, and `git push origin --delete feature/x` deletes the head branch of a PR that was never merged.

## Impact

A merge refused for a conflict or branch protection destroys the branch under review. The PR is closed on the platform, and the work survives only in the local checkout.

## Recommendation

Replace both `HALT` calls with real bodies (`{ echo "…"; exit 1; }`), as develop-batch does. Remove `HALT()` from the test PRELUDE so the test runs the block as shipped, and add a failed-merge case asserting the remote branch survives.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: `HALT` in develop-next is prose for an operator, and it has no shell body. The guard wrote it as if it were a command.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: Both guard sites in the develop-next merge block now use real bodies: `{ echo "HALT: …"; exit 1; }`. The test PRELUDE no longer defines `HALT()`, so the block runs as shipped. A new case refuses the merge on a dirty tree and asserts a non-zero exit with origin still holding the head branch.

**Files Modified**: skills/develop-next/SKILL.md; shared/resources/tests/merge-delete-branch-guard.test.mjs

**Testing**: Mutation: restoring `|| HALT` turns "a refused merge on a dirty tree halts and deletes nothing" red for develop-next under bash and zsh.

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 1                              |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started                   |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved     |

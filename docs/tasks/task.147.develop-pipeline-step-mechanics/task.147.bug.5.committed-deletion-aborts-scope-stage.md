# Bug Report: Task 147 - A path deleted in a commit before Step 4 aborts the scoped Step 4 staging

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, CR-6)
**Date Found**: 2026-09-25

## Description

The derivation adds every path in the committed diff, including one that was deleted. A pathspec `git add` on a path in neither the working tree nor the index exits 128.

**Location**: shared/resources/develop-pipeline-step-4-create-pr.md (Scope-derivation)

## Steps to Reproduce

Commit `git rm package.json` on the branch, run the derivation, then the scope-mode stage.

## Expected Behavior

The deleted path is skipped, and staging succeeds.

## Actual Behavior

`fatal: pathspec package.json did not match any files`, exit 128, nothing staged.

## Impact

The Step 4 commit aborts on any branch that deleted a file in an earlier commit.

## Recommendation

Skip derived entries that exist in neither the working tree nor the index (an uncommitted deletion is still in the index and stays), and add a committed-deletion fixture.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The derivation added every path in the committed diff, including deletions, and a pathspec `git add` on a path in neither the working tree nor the index exits 128.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The derivation skips an entry that exists in neither the working tree nor the index (`[ -e ] || git ls-files --error-unmatch`). An uncommitted deletion is still in the index, so it is kept and its removal is staged.

**Files Modified**: shared/resources/develop-pipeline-step-4-create-pr.md; shared/resources/tests/commit-changes-scope-mode.test.mjs

**Testing**: New case: a root file and a directory are removed in an earlier commit and a work-item file is deleted uncommitted. Staging exits 0 and stages the uncommitted deletion. Mutation: removing the existence guard turns it red.

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 1                              |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started                   |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved     |

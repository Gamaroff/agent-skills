# Bug Report: Task 200 - Three sync sites pass an unbound relative path to the resolver

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1 diff code review, CR-1)
**Date Found**: 2026-10-20

## Description

Three update blocks read a path variable that nothing assigns:

- `skills/sync-github-task/SKILL.md:110` reads `${TASK_RELATIVE_PATH}`.
- `skills/sync-github-bug/SKILL.md:111` reads `${BUG_RELATIVE_PATH}`.
- `skills/sync-github-story/SKILL.md:157` reads `${STORY_RELATIVE_PATH}`.

`grep -n RELATIVE_PATH` over each file finds the reads and no writer. The variable was already
unbound on `develop`, where it degraded the URL to `blob/<branch>/`. Now it reaches
`doc-link-branch.js --doc ""`, which exits 2 (`--doc is required`). The `:?` guard then stops the
update path, and its message blames a missing bundled copy.

## Expected Behavior

Each block binds the document's repo-relative path itself, or names the `{placeholder}` that fills
it, and the link names the document.

## Actual Behavior

The update path stops on an empty `--doc`, and the guard message names the wrong cause.

## Impact

A sync of an existing issue fails, where before it posted a broken link. The defect predates this
branch, but this branch made it fatal.

## Recommendation

Bind the relative path in each block, for example from the input file via
`git ls-files --full-name`, or substitute a `{placeholder}`. Word the guard to cover a resolver usage
error as well as a missing copy. The test BUG-1 adds should run these blocks with only the inputs
the block names, so an unbound read fails it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 1)

**Root Cause Analysis**: sync-github-task, -bug and -story read `${X_RELATIVE_PATH}` in their update block, and nothing in the skill bound it. The ensure sites and sync-github-epic bound it in prose only ("Set X_RELATIVE_PATH = …"), which a shell running the block never sees.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: Every site now binds `X_RELATIVE_PATH="{path of the … file, relative to the repo root}"` on the line before the call, in the same block. The new guard wording names the `--doc` path as a cause as well as a missing copy.

**Files Modified**:

- The same eight `SKILL.md` files as BUG-1

**Testing**: The execute test takes the binding only from the block before the call, and fails a site with none. Mutation: deleting the binding in `sync-github-bug` turns it red (`no BUG_RELATIVE_PATH= binding in the block before the call`). The control test also proves an unbound path trips the guard at run time.

**Verification Steps for QA**:

1. `command node --test tests/doc-link-branch-sites-execute.test.js`: all pass.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 1 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 1) |
| 2026-10-20 | Closed | qa-task | Verified by task.200.qa.2.tracker-side-effects-after-their-gate.md |

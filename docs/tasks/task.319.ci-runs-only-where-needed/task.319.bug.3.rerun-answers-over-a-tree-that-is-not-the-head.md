# Bug Report: Task 319 - A re-run answers over a tree that is not the head

**Task**: [Link](./task.319.ci-runs-only-where-needed.md)
**Bug ID**: TASK-319-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-24

## Description

`finalise-rerun-at-head.js` decides that the working tree is the head by asking git, and git answers from the local index and configuration. Three of those answers hide an edit, so the engine answers `ran` (exit 0) with the edited file's output as the head's (T319-CR-401, T319-CR-402, T319-CR-403).

## Steps to Reproduce

In a scratch repository whose `finalise.rerunAtHead` command prints a tracked file:

1. Edit the file inside a submodule: `dirty-tree`. Then set skip-worktree on it inside the submodule.
2. Delete a tracked file: `dirty-tree`. Then set skip-worktree on it, with `core.sparseCheckout` unset.
3. Edit a submodule, change a file's mode, or edit a file: `dirty-tree` each time. Then set `submodule.<name>.ignore` to `all` or `dirty`, `core.fileMode=false`, or a `core.fsmonitor` hook that reports nothing.

## Expected Behavior

`dirty-tree` in every case: the tree is not the head.

## Actual Behavior

`ran` in every case, each with the control in the same repository answering `dirty-tree`.

## Impact

A criterion is graded on a file the head does not hold, and the DoD records it as a run at the head. `submodule.<name>.ignore` can be set in a committed `.gitmodules`, and `core.fileMode=false` is what git writes on filesystems without modes, so two of the forms need nobody to set anything on purpose.

## Recommendation

Compare the working tree with the head tree itself, submodules included, with every setting the comparison depends on forced, rather than adding one check per way of not looking. The T319-CR-204 test asserts the second form and must change.

## Developer Fix Cycle 3

**Date**: 2026-11-24

**Root cause**: the engine asked git what changed (`git status`, then a diff of the files it was told to skip), and git answers from the index and the local configuration.

**Fix**: the mechanism is replaced. The engine reads the head's own tree, compares every file, link and mode in the working tree with it, does the same inside each checked-out submodule, and compares every index entry. Nothing is asked of git about what changed. A submodule that was never checked out is an empty directory and is let through. A sparse checkout that leaves code out is refused.

**Tests**: `shared/resources/tests/finalise-rerun-at-head.test.mjs`: sixteen ways of hiding an edit are refused with the path named, and a checkout holding links, modes, filters, line endings, odd file names and a submodule answers `ran`. Each comparison is red when it is removed.

**Verify**: the three forms above each answer `dirty-tree`; a clean clone of this repository answers `ran`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-24 | Ready for QA | qa-fix | Fixed in QA cycle 3 |

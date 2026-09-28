# Bug Report: Task 154 - The relative-base test cannot tell the invoking directory from the repository

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 4, code review CR-2)
**Date Found**: 2026-09-29

## Description

The relative-base case ran from the fixture repo's top level, where "the invoking directory" and "the repository" are the same place. A missing `rel-base` also read as empty. So a runner that resolved the relative base against the repository, or anywhere else, passed.

## Expected Behavior

The assertion fails when the property it names is broken.

## Recommendation

Invoke from a subdirectory and assert where the base was created and where it was not.

## Developer Fix Cycle

### Iteration 1

The case now invokes from `<repo>/sub`. It asserts that `<repo>/sub/rel-base` exists and is empty, and that `<repo>/rel-base` does not exist. **Mutation J2**: resolving against `git rev-parse --show-toplevel` now reds the case. The old assertion passed it.

## Status History

| Date       | Status       | Changed By | Notes                                                                  |
| ---------- | ------------ | ---------- | ---------------------------------------------------------------------- |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 4 (filed late: the gate listed it, the file followed) |
| 2026-09-29 | Ready for QA | qa-fix     | Fix implemented (cycle 4)                                              |

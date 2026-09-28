# Bug Report: Task 154 - The runner tests' base-is-empty checks pass on a deleted base

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 4, code review CR-1)
**Date Found**: 2026-09-29

## Description

In `tests/test-clean-checkout.test.js`, `entries()` returned `[]` for a missing directory as well as for an empty one. So every "left nothing behind" check passed on a runner that deleted the base. The never-deletes case also used only bases that already existed and were non-empty, so "never deletes the base" went untested for a base the runner itself created.

## Expected Behavior

The assertion fails when the property it names is broken.

## Recommendation

Make a missing base distinguishable from an empty one, and cover a base the runner creates.

## Developer Fix Cycle

### Iteration 1

`entries()` now asserts that the directory exists before listing it, so a missing base throws. The never-deletes case adds a created base: it checks that the base is absent first, runs, then asserts the base is present and empty. **Mutation J1**: a trap that also runs `rmdir` on an empty base now reds 4 tests. The old assertions passed it.

## Status History

| Date       | Status       | Changed By | Notes                                                                  |
| ---------- | ------------ | ---------- | ---------------------------------------------------------------------- |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 4 (filed late: the gate listed it, the file followed) |
| 2026-09-29 | Ready for QA | qa-fix     | Fix implemented (cycle 4)                                              |

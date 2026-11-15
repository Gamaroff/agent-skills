# Bug Report: Task 308 - The recorded-head writer in finalise 6c is held by no test

**Task**: [Link](./task.308.pause-commits-cancel-the-step-7-ci-poll.md)
**Bug ID**: TASK-308-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-14

## Description

`skills/finalise/SKILL.md` 6c records the acceptance head the poll starts on with `printf '%s\n' "$CI_HEAD_2" > .claude/state/finalise-ci-head-2.txt`. The later turn reads that file. The new tests write the file themselves, so nothing holds the writer.

## Steps to Reproduce

Delete the writer line from `skills/finalise/SKILL.md` and run `node --test evals/shared/tests/finalise-publish-boundary.test.mjs`.

## Expected Behavior

A test goes red.

## Actual Behavior

All tests stay green (exit 0). Control: reverting the later-turn reader does turn three tests red.

## Impact

A later edit can drop the writer, after which every finalise run HALTs after its full CI wait with "not recorded".

## Recommendation

Add a test that extracts the 6c poll block lines, runs them with `CI_HEAD_2` set, asserts the file holds that value, and mutation-prove it by deleting the writer.

## Developer Fix Cycle

### Iteration 1

**Root cause**: the earlier tests proved the reader by creating the file themselves, so the writer was never executed by a test.

**Fix**: new test `6c poll block records the acceptance head it starts on, for the later turn to read` in `evals/shared/tests/finalise-publish-boundary.test.mjs`. It extracts the one writer line from the 6c block, runs it with `CI_HEAD_2` set in a scratch directory, and asserts the file holds that value.

**Mutation proof**: deleting the writer line from `skills/finalise/SKILL.md` turns the new test red; restored, the file is green.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-14 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
| 2026-11-14 | Closed | qa-task | Verified by task.308.qa.2.pause-commits-cancel-the-step-7-ci-poll.md |

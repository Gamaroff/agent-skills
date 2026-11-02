# Bug Report: Task 174 - The concurrency guard passes on a broken group

**Task**: [Link](./task.174.ci-docs-only-classifier-template.md)
**Bug ID**: TASK-174-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; code review CR-1, reproduced)
**Date Found**: 2026-11-02

## Description

`docs/examples/ci/github-actions/changes-job.test.js` was added in QA cycle 1 to hold the fix for
TASK-174-BUG-1. Its group test only checks substrings:

- `github.event.pull_request.number` appears;
- `github.run_id` appears;
- `github.ref` followed by a word boundary does not appear.

`\b` falls between `f` and `_`, so `github.ref_name` passes the third check. The guard also reads
only a top-level `concurrency:` block, so a job-level block is invisible to it.

## Steps to Reproduce

1. Set the group to `ci-${{ github.event.pull_request.number || github.run_id && github.ref_name }}`.
2. Run `command node --test docs/examples/ci/github-actions/changes-job.test.js`.
3. Both tests pass. (QA ran the three matchers on that string: `true true true`.)

## Expected Behavior

Any group other than the intended one fails the test.

## Actual Behavior

A group that puts every base-branch push in one group per branch passes. That is the condition
TASK-174-BUG-1 removed.

## Impact

The fix for TASK-174-BUG-1 has a guard that does not guard it.

## Recommendation

Pin the whole `group:` value as an exact string, as `cancel-in-progress` already is. Also assert
that the snippet has no job-level `concurrency:` key.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-02

**Root Cause**: The cycle-1 guard described "the intended group" with three pattern checks. A
pattern check accepts every string that satisfies it, and `\b` does not separate `ref` from `_name`.

**Fix**: `changes-job.test.js` now pins the block. It asserts that the file has exactly one
`concurrency:` key, at any indent, and that it is top-level. It also asserts that the block's lines
are exactly the pinned `group:` and `cancel-in-progress:` lines, compared whole, so a trailing
comment or an extra key fails.

**Verification**: mutation-proven, one red each:

- M10 `github.ref_name` evasion (this bug's repro);
- M11 workflow prefix dropped;
- M8 `cancel-in-progress: true`;
- M12 trailing `# github.run_id` comment;
- M13 a job-level `concurrency:`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | New | qa-task | Filed in QA cycle 2 |
| 2026-11-02 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |

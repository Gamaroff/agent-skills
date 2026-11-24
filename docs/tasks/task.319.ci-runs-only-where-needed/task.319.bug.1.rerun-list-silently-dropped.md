# Bug Report: Task 319 - A rerunAtHead list is silently dropped

**Task**: [Link](./task.319.ci-runs-only-where-needed.md)
**Bug ID**: TASK-319-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-24

## Description

`parseRerunList` in `shared/resources/finalise-rerun-at-head.js` reads several configurations that name commands as an empty or shorter list, and the engine answers `not-configured` at exit 0 (T319-CR-1).

## Steps to Reproduce

Call `parseRerunList` with `finalise:`, `  rerunAtHead:`, `  - npm run x` (the list at the key's own indent).

## Expected Behavior

The entry, or a usage error naming the problem.

## Actual Behavior

`[]`. The same for a top-level list and a duplicate `finalise:` block; a mis-indented row and a `#` inside an entry shorten the list.

## Impact

The criterion keeps the grade of an earlier head's run, with nothing said.

## Recommendation

Account for every row of the block, as `ci` and `pipeline` do, and refuse what the parse does not cover.

## Developer Fix Cycle 1

**Date**: 2026-11-24

**Root cause**: the YAML subset ends a block at a dedent without an error, and `parseRerunList` read what was left.

**Fix**: the parse now accounts for every row of the `finalise` block with the functions the `ci` and `pipeline` blocks use (`assertMapping`, `assertBlockRows`, exported from `shared/resources/ci-tree-equivalence.js`). A key with no value, a list row the parse drops or cuts short, a second `finalise` block and content that is not a mapping are usage errors (exit 2), which `/finalise` HALTs on.

**Tests**: `shared/resources/tests/finalise-rerun-at-head.test.mjs`; each is red when the check it covers is removed.

**Verify**: call `parseRerunList` with the list at the key's own indent: it throws a usage error.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-24 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-11-24 | Closed | qa-task | Verified by task.319.qa.2.ci-runs-only-where-needed.md |

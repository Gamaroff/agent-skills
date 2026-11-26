# Bug Report: Task 320 - A block under its exact key is dropped when the parse never reaches it

**Task**: [Link](./task.320.task-319-leftover-findings.md)
**Bug ID**: TASK-320-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-25

## Description

A `ci`, `pipeline` or `finalise` key past the row at which the parse stops is refused when it is misspelt, and read as absent when it is spelt exactly, in two shapes the row count does not see: a file that is indented whole, and a lone CR before the key (T320-CR-502).

## Steps to Reproduce

Give `parseConfig` a file indented by two spaces: `note: |` with a line of text, then `ci:` with `docsOnly.enabled: false`.

## Expected Behavior

A usage error. The reference says the parse must account for every row of the block.

## Actual Behavior

`enabled` is `true`. The same file without the indent is refused (control). The same on `c160ee638` and on `origin/develop`.

## Impact

An opt-out is ignored without a word. No file in this repository has either shape.

## Recommendation

Refuse a block whose key the source has and the parse does not.

## Developer Fix Cycle 1

**Date**: 2026-11-26

**Root cause**: the row count reads rows at column 0 and the near-miss check reads spellings, so a key at another column, or one the parse ran into another row, was checked by neither.

**Fix**: `assertBlockRows`, which every block's reader calls, also counts the key in the rows the file writes at its top level. A file that writes `ci`, `pipeline` or `finalise` more often than the parse reads it is refused. Those rows are read as YAML reads them: a lone CR ends a line, and an anchor, a tag or the `?` of an explicit key stands before the key. Near misses are looked for in the parsed keys and these rows together (T320-CR-503).

**Tests**: CR3-3 in `ci-tree-equivalence.test.mjs`, the pipeline block in `push-policy.test.mjs`, and T319-CR-406 in `finalise-rerun-at-head.test.mjs`, each red on `90aabca6c`. The control loop now carries the exact key, and one behind an anchor, inside a block scalar, under another block and in a comment.

**Verify**: the steps above are refused. All 1,238 tracked YAML files parse as on `origin/develop`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-26 | Ready for QA | qa-fix | Fixed in QA cycle 5 |
| 2026-11-26 | Closed | qa-task | Verified by task.320.qa.6.task-319-leftover-findings.md (T320-CR-502 FIXED) |

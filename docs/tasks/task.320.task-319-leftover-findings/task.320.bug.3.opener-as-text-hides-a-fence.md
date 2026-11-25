# Bug Report: Task 320 - A comment opener that is only text hides a fence

**Task**: [Link](./task.320.task-319-leftover-findings.md)
**Bug ID**: TASK-320-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-25

## Description

`finalise-rerun-at-head.js` takes a comment opener as closed when any later line of the document contains `-->` (T320-CR-501). An opener inside a sentence, with a comment far below it, hides the fences between them. A `## ` line in such a fence then ends the criteria section.

## Steps to Reproduce

Configure `finalise.rerunAtHead: [echo a]`. Give the engine a document whose criteria section holds the line `Use <!-- here`, then a fence that holds a `## ` line, then a list item naming the command. End the document with a comment.

## Expected Behavior

`scan-broken`, as on `c160ee638`.

## Actual Behavior

`none-named`, exit 0. Without the last comment, or without the opener, the answer is `scan-broken` (controls).

## Impact

A criterion that names a listed command is not re-run, and nothing says so. Introduced by the fix of DoD gap 2.

## Recommendation

Let only an opener that starts a Markdown comment block hide a fence.

## Developer Fix Cycle 1

**Date**: 2026-11-26

**Root cause**: one test for every opener: is there a `-->` on any later line? An opener in a sentence is no comment block, and the closer it found belonged to another comment.

**Fix**: `partsOf` reads a comment block as Markdown does. It starts at an opener at column 0, outside a fence, that a later line closes, and ends at the first line holding `-->`. Any other opener hides nothing from the fence split. The comment removal that the other reading uses is back as it was on `c160ee638`.

**Tests**: "an opener that starts no comment block hides no fence" in `shared/resources/tests/finalise-rerun-at-head.test.mjs`: eight opener shapes and four closers, with controls; red on `90aabca6c`. Seven mutations of the block rule each turn it, or T319-CR-805, red.

**Verify**: the steps above answer `scan-broken`. Every tracked Markdown file (5021) splits as on `c160ee638` and `90aabca6c`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-26 | Ready for QA | qa-fix | Fixed in QA cycle 5 |

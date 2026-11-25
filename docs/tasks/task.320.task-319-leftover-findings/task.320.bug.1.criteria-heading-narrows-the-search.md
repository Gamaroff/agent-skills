# Bug Report: Task 320 - A heading that only contains "criteria" still narrows the search

**Task**: [Link](./task.320.task-319-leftover-findings.md)
**Bug ID**: TASK-320-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-25

## Description

`finalise-rerun-at-head.js` searches the whole document only when the reader knows no criteria heading (T320-CR-101). A document with an empty `## Success Criteria` is searched under the headings that contain the word, so a command under any other heading is missed.

## Steps to Reproduce

Configure `finalise.rerunAtHead: [echo a]` and give the engine a document with an empty `## Success Criteria`, then `## Done when` with a criterion naming the command, then `## Rollback criteria` with any text.

## Expected Behavior

`scan-broken`: the document names a listed command and has no criterion the reader can find.

## Actual Behavior

`none-named`, exit 0. With the last heading spelled `## Rollback`, the answer is `scan-broken` (control).

## Impact

A criterion that names a listed command is not re-run, and nothing says so.

## Recommendation

When no criterion is readable, let only the section the reader knows narrow the search, and search the whole document when it names nothing.

## Developer Fix Cycle 1

**Date**: 2026-11-25

**Root cause**: the search was narrowed whenever any heading with the word had text under it, so a section that says nothing about where the criteria are could hide the one that does.

**Fix**: `finalise-rerun-at-head.js` narrows the search only when something is written under a section the reader knows, or under an AC heading. A heading, a comment or a rule is not something written. Otherwise the whole document is searched.

**Tests**: `shared/resources/tests/finalise-rerun-at-head.test.mjs`, T319-CR-805: seven inputs that must be refused and one that must not, red on `601134810`. Seven mutations of the rule each turn that test red.

**Verify**: the steps above answer `scan-broken`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-25 | Ready for QA | qa-fix | Fixed in QA cycle 1 |

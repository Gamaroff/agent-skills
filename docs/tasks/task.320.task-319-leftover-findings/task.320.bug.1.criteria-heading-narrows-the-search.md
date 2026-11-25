# Bug Report: Task 320 - A heading that only contains "criteria" still narrows the search

**Task**: [Link](./task.320.task-319-leftover-findings.md)
**Bug ID**: TASK-320-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
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

## Developer Fix Cycle 2

**Date**: 2026-11-25

**Root cause**: the rule of cycle 1 listed what does not count as content, and every text outside that list still narrowed the search (T320-CR-202, T320-CR-203, T320-CR-204).

**Fix**: the rule is now an allow-list. A section the reader knows, or one under an AC heading of its own, narrows the search only when it holds a list item, a table row, a Given, When or Then line, or a line of text under an AC heading. A comment that is not closed runs to the end of the section.

**What changed for a document**: a criteria section that holds only plain text, or only a fence, no longer narrows the search. Such a document is refused when it names a listed command anywhere.

**Tests**: `shared/resources/tests/finalise-rerun-at-head.test.mjs`, T319-CR-805, red on `5afd1ebd5`. It is three tests now, each on one repository. Two inputs changed with the rule: the fenced one has a `Given` line added, and `Below.` moved to the refused ones.

**Verify**: the steps above, and the four inputs of T320-CR-202 to T320-CR-204, answer `scan-broken`.

## Developer Fix Cycle 3

**Date**: 2026-11-25

**Root cause**: comments were removed from each section after the document was split, so a heading in a comment still split it (T320-CR-301); a first word alone made a line of prose a criterion (T320-CR-304); and the removal knew no fence (T320-CR-305).

**Fix**: comments are removed once, from the whole document, before it is split. A fence or a code span opens none, and text after a comment does not begin its line. A `Then` line counts only after a `Given` or `When` line under the same heading. The command is searched for with the comments and without them.

**What changed for a document**: a criteria section whose only criterion is one `Given`, `When` or `Then` line, with no list or table, no longer narrows the search.

**Tests**: T319-CR-805 in `shared/resources/tests/finalise-rerun-at-head.test.mjs`, two of its tests red on `846320549`. The Given inputs have a `Then` line added.

**Verify**: the inputs of T320-CR-301 and T320-CR-304 answer `scan-broken`, that of T320-CR-305 `none-named`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-25 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-11-25 | Reopened | qa-task | Not fixed by task.320.qa.2.task-319-leftover-findings.md |
| 2026-11-25 | Ready for QA | qa-fix | Fixed in QA cycle 2 |
| 2026-11-25 | Reopened | qa-task | Not fixed by task.320.qa.3.task-319-leftover-findings.md |
| 2026-11-25 | Ready for QA | qa-fix | Fixed in QA cycle 3 |
| 2026-11-25 | Closed | qa-task | Verified by task.320.qa.4.task-319-leftover-findings.md |

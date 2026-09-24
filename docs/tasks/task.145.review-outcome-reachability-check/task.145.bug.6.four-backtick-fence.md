# Bug Report: Task 145 - The four-backtick fence guard regression

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR3-1)
**Date Found**: 2026-09-25

## Description

`BACKTICK_INFO_HAS_BACKTICK` (a regex of the form: optional space, three or more backticks, non-backticks, one backtick) backtracks so that the opening run gives up its fourth backtick to the "info string". A line of four backticks, or four backticks followed by `markdown`, therefore tests true, and no fence of four or more backticks opens. That undoes cycle 1's CR-3 fix.

## Location

tests/outcome-reachability-check.test.js

## Recommendation

See gate 3 `CR3-1` suggested_action.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Root Cause**: The guard tested the whole line against "run, non-backticks, backtick", which backtracks into the run.

**Fix Description**: The guard now tests only the text after the whole opening run (`line.slice(m[0].length).includes("`")`). A new self-test puts a quoted `### ` heading inside a four-backtick fence, with no inner fence.

**Files Modified**: tests/outcome-reachability-check.test.js

**Testing**: Reverting to the old regex turns the new self-test red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 3 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 3 fix |

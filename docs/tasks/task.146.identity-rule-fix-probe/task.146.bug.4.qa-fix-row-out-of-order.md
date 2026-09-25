# Bug Report: Task 146 - The single qa-fix Change Log row is out of order

**Task**: [Link](./task.146.identity-rule-fix-probe.md)
**Bug ID**: TASK-146-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 3, scoped review CR-1)
**Date Found**: 2026-09-25

## Description

qa-fix writes one Change Log row per fix loop. Cycle 2 kept that rule by rewriting the cycle-1 row in
place, but the row stayed at cycle 1's position. It now reports QA-4 and QA-5 fixed from above the
"QA gate CONCERNS (90/100)" row that raised them.

## Steps to Reproduce

`sed -n '/^| Date | Version/,/change-log-end/p'` on the task document.

## Expected Behavior

The qa-fix row follows every gate row it answers.

## Actual Behavior

The row sits between the cycle-1 and cycle-2 gate rows.

## Impact

The document's own history reads as though the cycle-2 findings were fixed before they were raised.

## Recommendation

On each update, move the single qa-fix row to the end of the table. That keeps one row per loop,
and the row always follows the latest gate.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-25

**Root Cause**: qa-fix's "one Change Log row per loop" rule was honoured by rewriting the row in place, but a row rewritten in place keeps its original position. qa-fix cannot know which cycle is the last, so the row is written on the first cycle, and each later gate row lands below it.

**Fix Description**: On each update, the single qa-fix row is removed and re-appended through `change-log.js` (`upsertChangeLog` appends at the end). The row now reads "cycles 1–3 … 3 iterations" and sits after the cycle-3 gate row. Structural check: exactly one qa-fix row, positioned after the last qa-task row.

**Files Modified**: `docs/tasks/task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md`

| Date       | Status       | Changed By | Notes               |
| ---------- | ------------ | ---------- | ------------------- |
| 2026-09-25 | Ready for QA | qa-fix     | Fixed in QA cycle 3 |

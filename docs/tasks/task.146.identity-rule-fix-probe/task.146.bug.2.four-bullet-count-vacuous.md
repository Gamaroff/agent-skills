# Bug Report: Task 146 - The four-bullet assertion passes with a fifth bullet after the paragraph

**Task**: [Link](./task.146.identity-rule-fix-probe.md)
**Bug ID**: TASK-146-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, from code review CR-3, mutation-verified)
**Date Found**: 2026-09-25

## Description

`tests/identity-rule-probe.test.js` → "the identity entry sits outside the four-transition list"
counts `•` bullets only between "probe these four transitions" and the Identity rules paragraph.

## Steps to Reproduce

In both REFUTE PASS blocks, insert `     • Replay            — x?` between the Identity rules paragraph
and "Review the COMBINATION", then run `command node --test tests/identity-rule-probe.test.js`.

## Expected Behavior

The count test goes red, because the block now holds five bullets under "these four".

## Actual Behavior

6/6 pass.

## Impact

"four" can become false while the test written to hold it stays green.

## Recommendation

Count every `•` bullet in the block and assert exactly four. Mutation-prove it with the placement above.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-25

**Root Cause**: The count sliced from the "these four" intro to the Identity rules paragraph, so a bullet after the paragraph fell outside the range it measured.

**Fix Description**: The test now counts every `•` bullet in the whole block and asserts exactly four, and separately asserts that all four precede the paragraph. It is mutation-proved: a fifth bullet after the paragraph, which previously left 6/6 green, now turns both "sits outside the four-transition list" tests red.

**Files Modified**: `tests/identity-rule-probe.test.js`

| Date       | Status       | Changed By | Notes               |
| ---------- | ------------ | ---------- | ------------------- |
| 2026-09-25 | Ready for QA | qa-fix     | Fixed in QA cycle 1 |
| 2026-09-25 | Closed       | QA         | Verified — qa.2 and qa.3 |

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-25

**Result**: Fixed. Verified in qa.2 and qa.3 — a fifth item after the paragraph written •, -, *, +, 1. and 2) each turned both "sits outside the four-transition list" tests red (covered). Closed after the 5c PR review flagged the status as stale (PC-1).

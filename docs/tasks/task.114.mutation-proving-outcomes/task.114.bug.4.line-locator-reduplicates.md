# Bug Report: Task 114 - The line locator and dedupe key combine to re-duplicate overlapping-window hits

**Task**: [Link](./task.114.mutation-proving-outcomes.md)
**Bug ID**: TASK-114-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR-2)
**Date Found**: 2026-09-12

## Description

Cycle 1 located the offending physical line as the first window line whose stripped text contains the bare count word, and keyed the dedupe on `file:thatLine:text`. Two pointers whose windows overlap but start at different `lo` therefore locate the same 'four shapes' violation at different lines whenever an earlier window line contains the same word on its own — the 'four of five' sentence this change adds to both qa-task and qa-story sits within three lines of the pointer — so one violation is reported twice, once at the wrong line. Reproduced with the test's own constants.

## Steps to Reproduce

Place two pointers to mutation-proving.md 4 lines apart with a 'four shapes' claim between them and a 'four of five' sentence above the first; run the test.

## Expected Behavior

One violation, at the line the words 'four shapes' actually occupy.

## Actual Behavior

Two violations, one at the 'four of five' line.

## Impact

A cycle-1 fix that is correct in the steady state and wrong in a transition — the class the refute pass exists for.

## Recommendation

Map `m.index` in the flattened string back through cumulative stripped-line lengths (plus the joining space) to the physical line, and key the dedupe on that pointer-independent location.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: the physical line was found by re-searching the window for the bare count word, so a decoy line containing the same word ("four of five") above the real hit won, and the dedupe key — built from that line — differed per pointer.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**:
- `flatten()` now returns the joined text and the start offset of each physical line; the line is `lineAt(starts, m.index)` — derived from the match position, pointer-independent, so overlapping windows produce the same key and the hit is reported once at the line it occupies. `matchAll` reports every count in a window (CR-6 folded in).

**Files Modified**: see the cycle-2 fix commit.

**Testing**: mutation-proven: two pointers 4 lines apart, a "four shapes" claim between them and "four of five" one line above → exactly one violation at the "four shapes" line (qa-task:477) → covered; two counts in one window → two violations → covered.

## Status History

| Date       | Status       | Changed By | Notes                     |
| ---------- | ------------ | ---------- | ------------------------- |
| 2026-09-12 | New          | QA         | Found (cycle 2 refute)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started     |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented           |

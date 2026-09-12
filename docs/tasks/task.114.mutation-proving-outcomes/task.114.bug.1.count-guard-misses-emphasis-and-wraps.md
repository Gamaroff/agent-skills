# Bug Report: Task 114 - The count guard misses an emphasised or line-wrapped count word

**Task**: [Link](./task.114.mutation-proving-outcomes.md)
**Bug ID**: TASK-114-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 3b diff code review, CR-1)
**Date Found**: 2026-09-12

## Description

`evals/shared/tests/mutation-proving-pointers-parity.test.mjs` applies `COUNTED_SHAPES`
(`\b<count>\s+shapes\b`) to each physical line in the window around a pointer. The defect class it
guards — a pointer that states a count of the document's shapes — evades it in two spellings this
repository actually uses: emphasis (`the **four** shapes`, `*four* shapes`) and a hard wrap between
the count word and `shapes` (`the four\nshapes vacuity takes`). Both were verified to pass silently.

## Steps to Reproduce

1. In `skills/develop/SKILL.md`, change the pointer to read `the **four** shapes vacuity takes`.
2. `command node --test evals/shared/tests/mutation-proving-pointers-parity.test.mjs` → 2 pass.
3. Alternatively wrap: `the four` / newline / `shapes vacuity takes` → 2 pass.

## Expected Behavior

Test 1 goes red naming the file and line, as it does for the unemphasised single-line spelling.

## Actual Behavior

Green. The reassuring-zero failure the file's own header warns about.

## Impact

The guard was written because three consumers carried a stale count for months; a guard that the
house prose style (hard-wrapped at ~90 columns, emphasis on the load-bearing word) walks past is the
same defect with a test vouching for it.

## Recommendation

Join the window's lines with a space, strip Markdown emphasis runs (`*`, `_`, backticks) before
matching, then test `\b<count>\s+shapes\b` on the joined text. Add the bold and line-wrapped
spellings to the test's mutation set and re-prove.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: `COUNTED_SHAPES` was applied to each physical line, so a count word separated from `shapes` by a line break, or wrapped in emphasis markers, never sat in one string the regex could see.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**:
- Match on the window's lines joined with a space and stripped of `*`/`_`/backtick runs (`flatten`), one match per pointer window.
- Locate the physical line the count word sits on for the message, and dedupe on `file:line:text` so overlapping windows report a shared hit once (CR-2 folded in).

**Files Modified**:
- `evals/shared/tests/mutation-proving-pointers-parity.test.mjs`

**Testing**: mutation-proven — `the **four** shapes` in qa-story → test 1 red naming `skills/qa-story/SKILL.md:373` → `covered`; `the four` / newline / `shapes` in qa-task → test 1 red naming `skills/qa-task/SKILL.md:474` → `covered`. Baseline 2/2 green between and after.

**Verification Steps for QA**: apply either spelling to any consumer pointer; expect test 1 red with the file and line.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Found (CR-1)          |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |

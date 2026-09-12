# Bug Report: Task 113 - `--annotate`'s `no-cell` guard is unreachable; a narrower consumer registry gets a data cell rewritten

**Task**: [Link](./task.113.develop-next-registry-bookkeeping.md)
**Bug ID**: TASK-113-BUG-3
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (Step 3b code review, CR-1)
**Date Found**: 2026-09-12

## Description

`annotate()` in `shared/resources/registry-tick.js` guards with `dataCells < 5 → no-cell`, but
`parseRegistry` already rejects rows with fewer than five cells (they never reach the call), so the
branch is unreachable — the fixture that nominally covers it accepts `no-row` for exactly that reason.
Meanwhile a registry with **5–7** columns and no notes column passes the guard, and the mode appends
`· PR #n merged` to whatever the last cell is. Verified: a 6-column
`# | Title | Status | Category | Priority | Created` table had its Created cell rewritten to
`2026-01-01 · PR #7 merged`.

## Expected Behavior

`no-cell`, nothing written, when the row's last column is a known data column rather than a notes
column.

## Actual Behavior

`annotated`; a data cell is corrupted.

## Impact

Silent corruption of a consumer's index on any registry shaped differently from this repository's.

## Recommendation

Resolve the notes cell from the header the walk already finds: if the last header cell maps to a
known data column (`status`, `category`, `priority`, `created`, `severity`, `area`, `issue`, `#`,
`title`), answer `no-cell`. Replace the unreachable numeric guard. Fixture: 6-column registry →
`no-cell`, registry byte-identical.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: as described above — confirmed by re-running the reproduction before the change.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**: The numeric `< 5` guard is replaced by header resolution: `findHeader()` locates the row's own table header and `no-cell` is answered when the last header cell names a known data column (`DATA_COLUMN_NAMES`), when the header and row disagree on cell count, or when the table has no header.

**Files Modified**: shared/resources/registry-tick.js · shared/resources/tests/registry-tick.test.mjs

**Testing**: Fixture: 6-column registry ending in `Created` → `no-cell`, `lastColumn: created`, byte-identical. Mutation: treating every last column as notes reds it.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Filed (QA cycle 1)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |
| 2026-09-12 | Closed       | QA         | Verified by re-executing the reproduction (QA cycle 2) |

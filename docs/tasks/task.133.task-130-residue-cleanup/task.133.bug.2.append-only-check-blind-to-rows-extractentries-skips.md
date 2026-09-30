# Bug Report: Task 133 - `rowsDropped` cannot see rows the writer keeps, so a lost row reads `ok`

**Task**: [task.133.task-130-residue-cleanup.md](./task.133.task-130-residue-cleanup.md)
**Bug ID**: TASK-133-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2, refute pass CR-1)
**Date Found**: 2026-09-30

## Description

`rowsDropped` compares only what `extractEntries` returns: rows whose first cell is a date, from the block `findChangeLog` picks. `upsertChangeLog` deliberately **preserves** rows that `isEntryRow` rejects, such as a `| Version | Date | Change | Author |` log. It also merges rows from a second legacy block. When one of those rows is dropped, the check reports `ok`. When every row of the base's log is in that shape, the check compares nothing and still reports `ok`. That is the "found nothing" versus "could not look" confusion again.

## Steps to Reproduce

Two documents whose logs use the Version-first column order, the second missing one row. `extractEntries(prev).length` → 0; `rowsDropped(prev, next)` → `[]`. The writer keeps both rows: `upsertChangeLog(prev, …)` still contains `| 1.1 | 2026-01-02 | second | b |`.

## Expected Behavior

The dropped row is reported. Failing that, a base whose log has rows but none parseable gets its own reason, never `ok`.

## Actual Behavior

`ok`, exit 0.

## Recommendation

Compare every table data row the writer carries (entry rows plus the preserved unparsed rows) from the chosen block and any legacy block it merges. Add a distinct reason (for example `unparsed-log`, exit 1 or 2) for a base whose log section has data rows that none of the readers parse. Test both, and mutation-prove.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: `rowsDropped` compared only `extractEntries` rows; the writer carries more (unparsed rows, other legacy blocks).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: `carriedRows(content)` reads the partition `upsertChangeLog` regenerates from: the entry rows plus the preserved unparsed rows of the chosen block (through the one `isUnparsedRow` predicate, now shared by the writer), and the entry rows of every other block it sweeps in. A legacy-block row is reported in its canonical form.

**Files Modified**: `shared/resources/change-log.js` (`isUnparsedRow`, `carriedRows`, `rowsDropped`); `shared/resources/tests/change-log.test.mjs` J5

**Testing**: J5 red → green. Mutation: `carriedRows` returning `extractEntries` → J5 red. The fdba78d9 fixture still reports 6.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in cycle 2 |

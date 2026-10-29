# Bug Report: Task 243 - `ensure` duplicates catalogue rows when `catalogueSection` is level 3 or deeper

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

`ensure` adds rows for missing exports under `### Added by wireframe-map`, at the end of
`ui.catalogueSection`. When that section is itself a `###` heading, the inserted heading ends the
section in `sectionBounds()`. The next run cannot see the names it added, so it appends the same
rows again under a second Added heading. The fault is at `shared/resources/wireframe-map.js:565`.

## Steps to Reproduce

1. A consumer with `catalogueSection: '### Components'` and a catalogue that lacks `Button`.
2. Run `wireframe-map.js ensure --json` three times.

Measured (QA cycle 1): every run reports `catalogue: updated`. After three runs the file holds 3
`### Added by wireframe-map` headings and 3 `Button` rows.

## Expected Behavior

The second run reports `unchanged` (SC-2), and no row is ever duplicated.

## Actual Behavior

Each run appends another heading and another copy of every added row.

## Impact

The consumer's catalogue grows by one block per pipeline run, with no warning. A `##` section is not
affected, which is the only level the suite tests.

## Recommendation

Nest the Added heading one level below the configured section's level, or have `catalogued()` scan
past it. Add a test that runs `ensure` twice with a `###` section and asserts `unchanged`.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: the Added heading was a fixed `###`. Under a `###` section it is a sibling heading,
so `sectionBounds()` ended the section at it and `catalogued()` never saw the rows below it.

**Fix**: `addedHeading(section)` in `shared/resources/wireframe-map.js` builds the heading one level
below `catalogueSection`. The default `## Components` still gets `###`, so existing catalogues are
unchanged. `docs/reference/configuration.md` states the rule.

**Testing**: new test "ensure under a level-3 section nests its heading below it, and a second run
writes nothing". It asserts one `####` heading and byte-identical files after runs 2 and 3.
Mutation-proven: restoring the fixed `###` turns that test red.

**Verification for QA**: run `ensure` three times with `catalogueSection: '### Components'`. Expect
`updated`, `unchanged`, `unchanged`, and one Added heading.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 1 (code review CR-1), reproduced with three `ensure` runs |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with a mutation-proven regression test (qa-fix cycle 1) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 2: regression test is mutation-proven, repro no longer fires at 8b431651 |

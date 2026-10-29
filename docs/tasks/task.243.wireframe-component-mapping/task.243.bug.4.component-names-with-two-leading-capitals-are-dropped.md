# Bug Report: Task 243 - Component names with two leading capitals are dropped from the catalogue

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

`barrelExports()` keeps a name only when it matches `^[A-Z][a-z][A-Za-z0-9]*$`. That regex
requires a lowercase second letter, so `HStack`, `VStack`, `QRCode` and `OTPInput` are all dropped.
The same pattern sits at `shared/resources/wireframe-map.js:494` and `:501`.

## Steps to Reproduce

A barrel that exports `Button` and `HStack`. Run `ensure`.

Measured (QA cycle 1): the seeded catalogue holds `Button` and no `HStack` row.

## Expected Behavior

Every PascalCase component is catalogued. Only all-caps constants such as `ICON_NAMES` are left out.

## Actual Behavior

`HStack` is missing. The review and QA hooks then report a node built from `HStack` as using a
component that is not in the catalogue.

## Impact

Layout primitives are often named this way, so a common component is missing from every seeded
catalogue, and the hooks raise false findings about it.

## Recommendation

Accept `^[A-Z][A-Za-z0-9]*$` and reject `^[A-Z0-9_]+$`, in both regexes. Add `HStack` to the
seeding test.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: both export regexes demanded a lowercase second letter. That was a proxy for "not
an all-caps constant".

**Fix**: `isComponentName()` in `shared/resources/wireframe-map.js` keeps a name that is PascalCase
and holds at least one lowercase letter. Both the `export { … } from` path and the local-export path
use it.

**Testing**: new test "barrel names with two leading capitals are components; all-caps constants
are not". It expects `HStack` (through `export *`) and `QRCode`, and rejects `URL` and `ICON_NAMES`.
Mutation-proven: restoring the old regex turns it red.

**Verification for QA**: a barrel exporting `HStack` seeds an `HStack` row.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 1 (code review CR-4), reproduced with `ensure` |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with a mutation-proven regression test (qa-fix cycle 1) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 2: regression test is mutation-proven, repro no longer fires at 8b431651 |

# Bug Report: Task 243 - The documented `componentExclude: [A]` form is silently ignored

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

The engine's own header shows `componentExclude: [ThemeProvider]`. `parseYamlSubset` has no flow
collections, so that line parses as the string `"[ThemeProvider]"`. `readUiConfig()` keeps
`componentExclude` only when it is an array, so the value becomes `[]` with no warning.
The fault is at `shared/resources/wireframe-map.js:116`.

## Steps to Reproduce

Set `componentExclude: [ThemeProvider]` in `skills-config.yaml` with a barrel that exports
`ThemeProvider`, then run `ensure`. The reviewer verified that the value parses as a string.

## Expected Behavior

`ThemeProvider` is left out of the catalogue, or the engine refuses the value and says why.

## Actual Behavior

The exclusion is dropped, and the provider is catalogued as a drawn component.

## Impact

A consumer who copies the example from the header gets the opposite of what they configured.

## Recommendation

Parse a one-line `[a, b]` list, or report a non-array value instead of replacing it. Change the
header example to the block-list form the parser supports, which `configuration.md` should match.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: `readUiConfig()` accepted only an array, and `yaml-subset.js` reads a one-line
`[A, B]` as a string.

**Fix**: `nameList()` in `shared/resources/wireframe-map.js` accepts a block list, a one-line
`[A, B]` (quoted or bare names) or a single name. The header example stays valid.
`docs/reference/configuration.md` lists the three forms.

**Testing**: new test "componentExclude accepts a one-line [A, B] list and a single name". It runs
`[Provider]`, `['Provider', Row]` and `Provider`, and asserts the fixture substitution applied.
Mutation-proven: restoring the array-only read turns it red.

**Verification for QA**: set `componentExclude: [Provider]` and run `ensure`. Expect no `Provider`
row.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 1 (code review CR-3) |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with a mutation-proven regression test (qa-fix cycle 1) |

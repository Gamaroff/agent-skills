# Bug Report: Task 243 - A `#` inside a quoted label truncates the label

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

`parseLine()` strips a trailing comment with `raw.replace(/\s+#.*$/, "")` before it reads the
label. The regex does not respect quotes, so a `#` inside a quoted label cuts the line there.
The fault is at `shared/resources/wireframe-map.js:174`.

## Steps to Reproduce

A work item whose wireloom block holds `text "Order #1234"`. Run `wireframe-map.js resolve` on it.

Measured (QA cycle 1): the node is reported as `{"signature":"window>text","label":"Orde"}`.

## Expected Behavior

The label is `Order #1234`.

## Actual Behavior

The label is `Orde`. `record` then keys a confirmed link on the wrong label, and a map row whose
Label column says `Order #1234` never matches.

## Impact

Any label holding ` #` (order numbers, hashtags, issue references) resolves wrongly and is asked
about again on every work item.

## Recommendation

Strip only a `#` outside quoted strings, as `yaml-subset.js` does, or drop the stripping if
Wireloom has no comment syntax. Add a test for a quoted `#`.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: `parseLine()` stripped a trailing `# …` comment. Wireloom has no trailing comments:
its comments are whole lines (`skills/wireframe/references/grammar.md`, Indentation Rules), and
`listNodes()` already skips those.

**Fix**: the strip is removed from `parseLine()` in `shared/resources/wireframe-map.js`, with a
comment saying why.

**Testing**: new test "parseLine keeps a # inside a quoted label: Wireloom comments are whole
lines". It covers a label with `#` plus a flag, and a whole-line comment that is still skipped.
Mutation-proven: restoring the strip turns it red.

**Verification for QA**: `resolve` a block holding `text "Order #1234"`. Expect label `Order #1234`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 1 (code review CR-2), reproduced with `resolve` |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with a mutation-proven regression test (qa-fix cycle 1) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 2: regression test is mutation-proven, repro no longer fires at 8b431651 |

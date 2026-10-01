# Bug Report: Task 172 - The completeness check passes when one over-count offsets one vanished row

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-25
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 6 scoped review; reproduced by QA, and independently by the reviewer)
**Date Found**: 2026-10-01

## Description

The check is an equality (`consumed !== rows.length`), so a row the parse dropped is hidden by any row it counted twice. With BUG-24's over-count from a list of maps elsewhere in the file, a duplicated opt-out key under `ci.docsOnly` is accepted:

```yaml
a:
  - x: 1
    y: 2
ci:
  docsOnly:
    enabled: true
    enabled: false
```

`parseConfig` returns `enabled: false` (the last duplicate wins here). Written the other way round (`enabled: false` then `enabled: true`) the same file silently turns the rule on against the owner's first line. Without the list of maps the same duplicate is refused (`4 content row(s) but the parse accounts for 3`), which is the case cycle 5 tested.

## Expected Behavior

A row the parse dropped is refused whatever else the file contains.

## Actual Behavior

Accepted; the configuration the engine uses is not the one the file says.

## Impact

The silent-fallback class this task has closed one spelling at a time since cycle 1, reachable only in a file that also contains a list of maps. It shares BUG-24's root cause: a count comparison is a proxy for "every row was read", and an inexact count makes the proxy both over- and under-refuse.

## Recommendation

Fix together with BUG-24. A count that is exact for the rows it covers (the `ci` block only) cannot be offset by rows elsewhere; alternatively have the parser report the rows it skipped instead of comparing totals. Test the offset shape, in both orders.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 6)

Reproduced by QA before the fix, and again by running the exported `parseConfig` on the documented `developBatch.resources` and `retrospective.identities` shapes and on the offset shape in both orders.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: the structural move, scope the claim (qa-fix Step 2.6, offered by the pipeline because every MEDIUM on gates 5 and 6 named `ci-tree-equivalence.js`). Cycle 5's check claimed to account for every row of the whole file, which is more than this engine reads and more than a count can say exactly. It now covers the rows of the `ci` block only (`ciBlockRows`: the `ci:` row and every row up to the next column-0 row, read from the text so a dropped row still counts), compared with `1 + consumedRows(parsed.ci)`; the `ci` block holds only mappings and lists of scalars, whose rows count exactly. Other sections, in any shape the YAML subset supports, are not this engine's business. `consumedRows` also stops counting a list element that is a map as a row of its own (the dash shares the first key's row), which is correct if the helper is ever pointed at another shape; nothing in the `ci` block reaches that branch. `significantLines` strips a trailing comment before the marker test, so `--- # note` is a marker (the LOW from the review).

With the count exact for the rows it covers and the rows it covers limited to `ci`, no row elsewhere in the file can offset one dropped from the `ci` block.

Tests: `CR6-2` refuses a duplicated opt-out in both orders with a one-element list of maps before and after the `ci` block (exactly the shape whose over-count cancelled the dropped row), and a first row indented deeper than `ci` with a list of maps after it. A two-element list does not cancel, so the test uses one on purpose. Mutation proof: reverting all three edits turns `CR6-2` red; `CR6-3` covers the marker, and removing the comment strip turns it red.

## Status History

| Date       | Status | Changed By | Notes               |
| ---------- | ------ | ---------- | ------------------- |
| 2026-10-01 | New    | QA         | Found in QA cycle 6 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

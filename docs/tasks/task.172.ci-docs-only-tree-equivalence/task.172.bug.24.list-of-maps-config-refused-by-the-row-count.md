# Bug Report: Task 172 - A list of maps anywhere in skills-config.yaml makes the row count refuse the file

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-24
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 6 scoped review; reproduced by QA, and independently by the reviewer)
**Date Found**: 2026-10-01

## Description

Cycle 5's completeness check (`parseConfig`, `consumedRows`) compares the number of content rows with the number the parse accounts for. `consumedRows` counts one row per list element **plus** every key of a map element, but in the source `- name: local` is one row that carries both the dash and the first key, so every map element over-counts by one. Any list of maps, in any section of the file, makes the counts differ and `parseConfig` throws a usage error (exit 2).

Reproduced by execution against the exported `parseConfig`, on shapes the repository documents in `docs/reference/configuration.md`:

- `developBatch.resources` (name, capacity, testCommand, a nested `probe` map): `17 content row(s) but the parse accounts for 19`.
- `retrospective.identities` (jira + git): `6 content row(s) but the parse accounts for 7`.
- the minimum: `developBatch:` / `resources:` / `- name: local` / `capacity: 1`, followed by a valid `ci.docsOnly` block: `7 content row(s) but the parse accounts for 8`.

The cycle 4 engine (`f3887635`) accepted the same text. `yaml-subset.js`'s own header names "lists of maps" as part of the shape it reads. The repository's own `skills-config.yaml` contains no list of maps, which is why the test that reads the real file passes.

## Expected Behavior

A valid, documented `skills-config.yaml` that says nothing about `ci` reads as "not configured" (the defaults), exactly as before cycle 5.

## Actual Behavior

The engine exits 2 on it. The three callers treat any non-zero exit as "not tree-equivalent", so the rule fails closed and a docs-only head waits for full CI. No wrong answer, but the shortcut is lost for every consumer of `/develop-batch` that configures `developBatch.resources`, or of the retrospective skill that configures `identities`.

## Impact

A regression introduced by cycle 5's own fix. Fails closed, so no wrong green; the loss is the feature, for a documented population, with only a stderr line.

## Recommendation

Do not compare counts over the whole file. Either count a map element as its keys only, or (the structural move, and it also closes BUG-25) check completeness only for the rows that belong to the `ci` block, which holds only mappings and lists of scalars and so can be counted exactly. Add tests that use the documented `developBatch.resources` and `retrospective.identities` shapes and assert they parse to the defaults.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 6)

Reproduced by QA before the fix, and again by running the exported `parseConfig` on the documented `developBatch.resources` and `retrospective.identities` shapes and on the offset shape in both orders.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: the structural move, scope the claim (qa-fix Step 2.6, offered by the pipeline because every MEDIUM on gates 5 and 6 named `ci-tree-equivalence.js`). Cycle 5's check claimed to account for every row of the whole file, which is more than this engine reads and more than a count can say exactly. It now covers the rows of the `ci` block only (`ciBlockRows`: the `ci:` row and every row up to the next column-0 row, read from the text so a dropped row still counts), compared with `1 + consumedRows(parsed.ci)`; the `ci` block holds only mappings and lists of scalars, whose rows count exactly. Other sections, in any shape the YAML subset supports, are not this engine's business. `consumedRows` also stops counting a list element that is a map as a row of its own (the dash shares the first key's row), which is correct if the helper is ever pointed at another shape; nothing in the `ci` block reaches that branch. `significantLines` strips a trailing comment before the marker test, so `--- # note` is a marker (the LOW from the review).

Tests: `CR6-1` parses the documented `developBatch.resources` (two elements, a nested `probe` map) and `retrospective.identities`, plus the minimum list of maps, with no `ci`, with an opt-out before them and with an opt-out after them, and runs the engine through git on a config holding `developBatch.resources` and an opt-out (reason `disabled`, not exit 2). Mutation proofs: scoping back to the whole file's rows, and a `ci` block that never ends at the next column-0 row, each turn `CR6-1` red; reverting all three edits (cycle 5's behaviour) turns `CR6-1` and `CR6-2` red.

## Status History

| Date       | Status | Changed By | Notes               |
| ---------- | ------ | ---------- | ------------------- |
| 2026-10-01 | New    | QA         | Found in QA cycle 6 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

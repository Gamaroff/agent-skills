# Bug Report: Task 238 - A test that shares its leaf name across describes reads pre-existing

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-10
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 5 safety re-probe, CR-1)
**Date Found**: 2026-10-28

## Description

`shared/resources/fast-gate-outcome.sh:89` keys each spec-mode failure as `file<TAB>name`, where
`name` is the leaf test name from the `✖ name (…ms)` line. Node's spec summary omits the parent
`describe`, so two tests in one file that share a leaf name produce the same pair. After `sort -u`
a head-only failure merges with a base failure of the same leaf name, and `comm` finds nothing
head-only. This is bug.5's widening one level down: across files it is fixed, within a file it is not.

## Steps to Reproduce

Measured on node 26.8.2:

1. At the base, `api.test.mjs` has `describe("GET") > it("returns 200")` failing and
   `describe("POST") > it("returns 200")` passing.
2. On the head, the POST test fails too.
3. Run `node --test api.test.mjs` on the head. The summary prints `test at api.test.mjs:3:25` /
   `✖ returns 200` and `test at api.test.mjs:4:26` / `✖ returns 200`.
4. Classify: `fast-gate-outcome.sh --log head.log --exit 1 --base develop`.

## Expected Behavior

`GATE_OUTCOME=attributable`: the POST failure is new on the head.

## Actual Behavior

`GATE_OUTCOME=pre-existing (returns 200;)`.

## Impact

A head-only red is committed and pushed as pre-existing, and the fix loop never sees it. This is the
outcome the classifier must keep narrow.

## Recommendation

Key each failure on its file plus `line:column`: the `test at` and `location:` lines carry both, in
both reporters. Two tests that share a leaf name then never match. A test whose line moved between
base and head reads attributable, which is the safe direction. Add a nested same-leaf-name case to
`qa-loop-fast-gate-outcomes.test.mjs`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The bug.5 fix keyed a failure on its file and leaf name. Node's spec summary prints
only the leaf, so two tests in one file that share a leaf name (one per `describe`) gave one key,
and `sort -u` merged them.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`):

- `failing_pairs` keys each failure on `file<TAB>line:column<TAB>name`. The spec `test at` line,
  the spec `location:` line and the TAP `location:` line all carry the position, so both reporters
  agree.
- A test whose line moved between base and head reads attributable: the safe direction.
- The `pre-existing (…)` line and the "names no file" refusal read the name from the third field.

**Testing**:

- **Red before**: "a head-only failure that shares its leaf name with a base failure in another
  describe (bug.10)" fails on `4ef29ed1`. It uses real `node --test` logs in both reporters.
- **Green after**: it passes, and so does its should-merge control: the same nested test, red at
  the same place on both sides, reads pre-existing in spec and TAP.
- **Mutation**: printing an empty position in spec mode turned the bug.10 test red.
- **Fixture correction**: the existing TAP-subtest test had a typed column (`3:54`) that node never
  prints. Node 26.8.2 prints `3:34`, so the fixture now uses that value.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 5 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 5 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.6.qa-loop-acts-on-signals-it-has.md |

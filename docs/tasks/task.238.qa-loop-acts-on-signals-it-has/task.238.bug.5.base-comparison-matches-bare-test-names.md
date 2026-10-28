# Bug Report: Task 238 - The base comparison matches bare test names, not tests

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 4 safety re-probe, CR-1; raised as advisory cycle-2 CR-5)
**Date Found**: 2026-10-28

## Description

`shared/resources/fast-gate-outcome.sh:151` decides `pre-existing` with
`comm -23 "$WORK/head-fails" "$WORK/base-fails"`. Both lists hold bare test names, with the file and
the suite discarded, so any head-only failure whose name matches a test already failing at the base
is classed `pre-existing`.

## Steps to Reproduce

1. At the base, `a.test.mjs` has a failing test `works`.
2. The head makes `b.test.mjs`'s test `works` fail. Or it adds `c.test.mjs` with a failing `works`;
   at the base, node skips the missing file and still runs `a.test.mjs`.
3. Run the classifier on the head's red log with `--base develop`.

Observed: `GATE_OUTCOME=pre-existing (works;)` from both the spec and the TAP log. The reviewer reproduced it in a scratch repository with a bare origin.

## Expected Behavior

`attributable`, because the failing test at the head is not the one that fails at the base.

## Actual Behavior

`pre-existing`. Step 0a then commits and pushes the red as if it were green.

## Impact

`pre-existing` is the one outcome that widens what the gate lets through, and the script calls it
"narrow by construction". A common test name (`works`, `a`, `renders`) is enough to bypass it.

## Recommendation

Compare `(file, test)` pairs: keep each `test at` / `location:` line paired with its failure line.
Treat any failing head file that does not exist at the base as `unavailable`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The comparison had two flaws:

- The two lists held bare test names, so a test was identified by its name alone.
- `node --test` silently skips a named file that does not exist. A failing file that is new on the
  head therefore produced no base reading at all, and so no mismatch.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`):

- `failing_pairs` replaces `failing_tests`. It reads each failing test as a `file<TAB>name` pair,
  in both spec form (`test at` then `✖ name`) and TAP form (`not ok` then `location:`). The checkout
  prefix is stripped from absolute locations: the head checkout's on the head side, the base
  worktree's on the base side.
- `comm` now compares pairs.
- A failing test the log names with no file is refused (`attributable`).
- After the base worktree is created, every failing file must exist in it, or the result is
  `attributable`.
- The base run uses the head log's own reporter (TAP when the head log is TAP). TAP lists a failing
  parent suite that spec omits, so the two sides must be read the same way.
- Advisory CR-6: a base that already contains `HEAD` is refused before the worktree is made.

**Testing**:

- **Red before**: all three bug.5 tests, the CR-6 test and the TAP subtest test fail on `adff39e2`.
- **Green after**: 42/42 in `qa-loop-fast-gate-outcomes.test.mjs`.
- **Mutations** (each restored from a snapshot):

  | Mutation | Test turned red |
  | --- | --- |
  | Compare names only (`cut -f2`) | the shared-name test |
  | Drop the missing-file check | the new-file test |
  | Drop the `merge-base` check | the CR-6 test |
  | Always use the spec reporter at the base | the TAP subtest test |

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 4 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 4 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.5.qa-loop-acts-on-signals-it-has.md |

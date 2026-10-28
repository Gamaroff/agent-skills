# Bug Report: Task 238 - pre-existing ignores a red that node tests do not explain

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 4 safety re-probe, CR-2; raised as advisory cycle-1 CR-3)
**Date Found**: 2026-10-28

## Description

`shared/resources/fast-gate-outcome.sh:153` prints `GATE_OUTCOME=pre-existing` once every failing
node test the head log names also fails at the base. It never checks that those tests account for
the gate's non-zero exit. A gate whose red also comes from another step (a linter, a format check,
this repository's test-tmpdir leak ratchet behind a wrapper that returns the suite's code) is still
classed `pre-existing`. The step 5-6 document says such failures stay attributable.

## Steps to Reproduce

1. Gate: `node --test a.test.mjs; echo 'lint: 3 errors'; exit 1`, where `a.test.mjs`'s `works`
   also fails at the base.
2. Run the classifier on that log with `--exit 1 --base develop`.

Observed: `GATE_OUTCOME=pre-existing (works;)`, as the reviewer reproduced it.

## Expected Behavior

`attributable`: the comparison cannot show that the whole red predates the change.

## Actual Behavior

`pre-existing`, so step 0a commits and pushes a red the change introduced.

## Impact

Any gate that runs more than node tests can push a new non-node failure, provided some node test
was already red at the base.

## Recommendation

Return `pre-existing` only when the log shows that node --test is the whole gate (the summary
accounts for the exit), or run the full `fastGateCommand` at the base and compare that. In every
other case return `unavailable`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The base run compares only `node --test` results. Nothing checked that those results
were the whole of the red, so a gate that failed on another step reported `pre-existing` whenever
its node failures also failed at the base.

**Decision** (asked during the fix and answered by the user): fail closed. The only exceptions are
output this repository's own fast gate always prints after a node red. A full base run of the fast
gate was rejected because it takes minutes and breaks the 90 s bound.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`):

- `trailer` returns the first line after node's results that is not node's own, so `pre-existing`
  needs an empty trailer. Lines that do not count:
  - the gate's `GATE_EXIT=` line
  - npm's `npm error` / `npm ERR!` failure report
  - a **clean** `tmp-leak` report: the entry count, `ratchet ok`, `notice —`
- A tripped ratchet (`new prefix`, `over its ratchet`), a wrapper failure line or any other step's
  output makes the result `attributable`, and the line is named.
- Calibrated on real `node --test` spec and TAP red logs from node 26.8.2: the trailer is empty on
  both, and one appended line trips it.

**Testing**:

- **Red before**: the three bug.6 tests fail on `adff39e2`. The control (npm's report plus a clean
  `tmp-leak` report is still `pre-existing`) passes before and after.
- **Mutation**: dropping the trailer check turned all three red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 4 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 4 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.5.qa-loop-acts-on-signals-it-has.md |

# Bug Report: Task 238 - Node's own non-test errors are never looked for

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-11
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 5 safety re-probe, CR-2)
**Date Found**: 2026-10-28

## Description

`trailer()` in `shared/resources/fast-gate-outcome.sh` (from `:111`) reads only what follows
node's results, and in TAP mode it accepts every `# ` line. Node itself can turn a run red for a
reason that is not a failing test: `--test-coverage-lines` (or `-branches`, `-functions`) prints
`ℹ Error: … coverage does not meet threshold …`.
- **In spec**, that line comes *before* `✖ failing tests:`, so the trailer never reads it.
- **In TAP**, it comes after the results as `# Error: …`, which the `# ` rule accepts.

The base run is a plain `node --test <files>` without the head's flags, so it can never reproduce
that red.

## Steps to Reproduce

Measured on node 26.8.2:

1. At the base, `api.test.mjs` fails test `returns 200`.
2. On the head, add `lib.mjs` with an uncovered function and import it from the test.
3. Run `node --test --experimental-test-coverage --test-coverage-lines=100 api.test.mjs`, once
   with the spec reporter and once with TAP. The spec log holds `ℹ Error: 66.67% line coverage
   does not meet threshold of 100%.`; the TAP log holds `# Error: …`.
4. Classify each log with `--exit 1 --base develop`.

## Expected Behavior

`GATE_OUTCOME=attributable` for both logs: the coverage red is the head's own.

## Actual Behavior

`GATE_OUTCOME=pre-existing` for both.

## Impact

A head-only coverage regression is pushed as pre-existing whenever any base test is already red.
This is the bug.6 class, through node itself.

## Recommendation

- Return `attributable` when the log holds a node diagnostic line (`ℹ Error:` or `# Error:`)
  anywhere.
- After TAP results, accept only node's own summary keys among `# ` lines: `tests`, `suites`,
  `pass`, `fail`, `cancelled`, `skipped`, `todo`, `duration_ms`, and the coverage report lines.
- Add spec and TAP coverage-threshold cases to the tests.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The classifier checked only for non-node output *after* node's results. Node's own
diagnostics were never examined. Measured on node 26.8.2:

- **Spec:** node prints its diagnostics, and only those, as `ℹ ` lines, and the threshold `Error:`
  comes before the failing-tests summary.
- **TAP:** node prints them as `# ` lines after the run's final top-level `1..N` plan. Before that
  plan, a `# ` line is a test's own stdout or stderr.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`): a new `stray_diagnostic` awk returns
the first node diagnostic that is not the run summary or the coverage report.

- **Allow-list:** `tests`, `suites`, `pass`, `fail`, `cancelled`, `skipped`, `todo` and
  `duration_ms`, plus the lines between `start of coverage report` and `end of coverage report`.
- **Spec:** every `ℹ ` line is checked.
- **TAP:** `# ` lines are checked after the final plan only, so a test's own output never counts.
- **Any other line** gives `attributable` ("node reported something that is not a test result: …")
  before the base runs.
- **Coverage error position:** in both reporters node prints the threshold `Error:` outside the
  coverage block, so the coverage allowance cannot hide it.

**Testing**:

- **Red before**: "node's own coverage-threshold error … (bug.11)" fails on `4ef29ed1`. It uses
  real `--test-coverage-lines=100` runs in spec and TAP.
- **Green after**: it passes, and it also asserts the base never ran.
- **Control**: a real coverage report plus a test that prints `Error: logged by the test` still
  reads pre-existing in both reporters.
- **Mutations**, each red:
  - The check ignored (bug.11 test).
  - TAP lines after the plan not checked (bug.11 TAP case).
  - The coverage allowance dropped (control).
  - TAP lines before the plan checked too (control).
- **Portability**: the three awk programs give identical output under gawk, `gawk --posix`,
  `gawk --traditional` and mawk 1.3.4 (on .249) over 7 real node logs.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 5 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 5 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.6.qa-loop-acts-on-signals-it-has.md |

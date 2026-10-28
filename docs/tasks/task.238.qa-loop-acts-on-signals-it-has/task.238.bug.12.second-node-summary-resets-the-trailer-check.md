# Bug Report: Task 238 - A second node summary resets the trailer check

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 5 probe engine, PRB5-1)
**Date Found**: 2026-10-28

## Description

`trailer()` in `shared/resources/fast-gate-outcome.sh` sets `bad = ""` each time a
`✖ failing tests:` line starts (`:111`), and each time a TAP run starts. So a non-node line found
after the first node run is forgotten when a second node run's summary follows it.

## Steps to Reproduce

Probe `log-trailer-between-two-runs` (`task.238.qa.5.security.cases.2.json`, record
`task.238.qa.5.security.run.json`) reproduces it. The log holds:

1. a spec summary for `t.test.mjs` / `a`
2. `lint: 3 errors`
3. a second spec summary for `t.test.mjs` / `a`

The base (`task.238.qa.5.security.setup.sh`) fails `a`.

## Expected Behavior

`BASE_CHECK=unavailable (the log has output after the node --test results: lint: 3 errors)`,
`GATE_OUTCOME=attributable`.

## Actual Behavior

`GATE_OUTCOME=pre-existing (a;)`.

## Impact

A lint (or other step) red between two node runs is pushed as pre-existing. This repository's gate
chains with `&&` and stops at the first failure, so it cannot produce this log. A consumer gate that
continues past a failing step can.

## Recommendation

Keep the first non-node line found after any node summary for the whole log; never reset it when a
later summary starts. Add the two-run case to `qa-loop-fast-gate-outcomes.test.mjs`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: `trailer()` cleared `bad` whenever a spec summary or a TAP run began. A line kept
from an earlier run was therefore lost.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`): `trailer()` no longer resets `bad`.
The first non-node line after any node results counts for the whole log.

**Testing**:

- **Red before**: "another step's red between two node runs (bug.12)" fails on `4ef29ed1`. It
  covers a spec form and a TAP form.
- **Green after**: it passes.
- **Mutation**: restoring the two resets turned it red.
- **Probe**: `log-trailer-between-two-runs` now expects attributable.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 5 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 5 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.6.qa-loop-acts-on-signals-it-has.md |

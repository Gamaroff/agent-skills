# Bug Report: Task 185 - a driver error is counted as a failed run

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2; raised as refute-pass CR-3)
**Date Found**: 2026-10-05

## Description

When `claude -p` exits non-zero (credit balance, crash, timeout), `runner.mjs` exits 1 from its driver-error catch. `repeat.mjs` counts that as a run that executed and failed, so an infrastructure failure prints `passed 0/N` with exit 1, the code for a real regression. The README promises no pass rate for runs that did not happen. The first live run of task.185 hit exactly this: the API key's account had no credit.

## Expected Behavior

A driver error stops the repeat as could-not-run (exit 3), like a skip.

## Recommendation

An opt-in `EVAL_DRIVER_ERROR_EXIT` in the runner, set by `repeat.mjs`, with a test that injects a failing fake `claude`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-05

**Root cause**: The runner's driver-error catch exited 1, and `repeat.mjs` counted 1 as a run that executed and failed.

**Fix** (QA cycle 2, consolidate move: one owner of the pass-rate exit status): The runner takes an opt-in `EVAL_DRIVER_ERROR_EXIT` (3–125). `repeat.mjs` sets it to 4, and on it prints `run i/N: driver error` and stops with exit 3, could not run. `eval:all` still gets 1.

**Testing**: Two tests: a fake `claude` that prints `Credit balance is too low` and exits 1 makes `repeat.mjs` exit 3, and the runner honours or ignores `EVAL_DRIVER_ERROR_EXIT`. Restoring `exit(1)` turns the first red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-05 | New | QA Engineer | QA cycle 2 |
| 2026-10-05 | Ready for QA | qa-fix | Fix + test, mutation-proven |
| 2026-10-05 | Closed | QA Engineer | QA cycle 3: reproduction re-run behaves |

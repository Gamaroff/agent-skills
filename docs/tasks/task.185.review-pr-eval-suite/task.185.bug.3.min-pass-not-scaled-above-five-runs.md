# Bug Report: Task 185 - live.minPass is not scaled above five runs

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 2, refute pass CR-2)
**Date Found**: 2026-10-05

## Description

`live.minPass` is calibrated for 5 runs. The cycle-1 fix caps it when there are fewer runs, but leaves it absolute when there are more: `--runs 10` with `minPass: 4` passes at 4/10 (40%), and the must-pass-every-run scenarios pass at 5/10.

## Steps to Reproduce

A scenario with `live: { minPass: 4 }`, `repeat.mjs <dir> --runs 10` → `passed 10/10 (min 4)`.

## Expected Behavior

The bar scales with the run count: `ceil(minPass × runs / 5)` (8 of 10).

## Recommendation

Treat `live.minPass` as a rate over 5 runs, in both directions, and say so in the output.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-05

**Root cause**: The cycle-1 fix capped `live.minPass` at `--runs`, which fixed the fewer-runs case only.

**Fix** (QA cycle 2, consolidate move: one owner of the pass-rate exit status): `live.minPass` is read as a count out of 5 and scaled to N as `ceil(k × N / 5)`, in both directions. Values outside 1..5 are usage errors, and the output names the scaling.

**Testing**: The test checks 5/5 → 1/1, 4/5 → 8/10 (the alternating scenario at 5/10 now fails) and 3/5 at 5 runs (no note). Restoring the cap turns it red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-05 | New | QA Engineer | QA cycle 2 |
| 2026-10-05 | Ready for QA | qa-fix | Fix + test, mutation-proven |

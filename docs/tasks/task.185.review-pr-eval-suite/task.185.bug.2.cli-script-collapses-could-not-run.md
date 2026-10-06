# Bug Report: Task 185 - eval:review-pr:cli collapses could-not-run to 1

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2, refute pass CR-1)
**Date Found**: 2026-10-05

## Description

The `eval:review-pr:cli` script loops over scenarios with `|| rc=1`, so `repeat.mjs`'s exit 3 (could not run) reaches the caller as 1 — the same code as a pass rate below `minPass`. `evals/review-pr/README.md` says the script exits 3.

## Steps to Reproduce

Run `npm run eval:review-pr:cli` with no `claude` on PATH; the exit status is 1.

## Expected Behavior

Exit 3 when any scenario could not run; exit 1 only for a real pass-rate failure.

## Recommendation

Keep the strongest status in the loop and test the script with no `claude` on PATH.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-05

**Root cause**: The npm script looped over scenarios and wrote `|| rc=1`, so every non-zero exit from `repeat.mjs` became 1.

**Fix** (QA cycle 2, consolidate move: one owner of the pass-rate exit status): `repeat.mjs` now takes several scenario directories and owns the exit status, and the script is one call: `DRIVER=claude-cli node evals/shared/repeat.mjs evals/review-pr/scenarios/*/`. The exit-status table is stated once, in `evals/shared/README.md`.

**Testing**: `repeat.test.mjs` runs the package.json command itself with `/bin/sh` and a PATH that holds only `node`, and expects exit 3. Restoring the old loop turns it red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-05 | New | QA Engineer | QA cycle 2 |
| 2026-10-05 | Ready for QA | qa-fix | Fix + test, mutation-proven |
| 2026-10-05 | Closed | QA Engineer | QA cycle 3: reproduction re-run behaves |

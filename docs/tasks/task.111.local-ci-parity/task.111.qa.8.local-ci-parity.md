# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md) · **Gate File**: [task.111.gate.8.local-ci-parity.yml](./task.111.gate.8.local-ci-parity.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-09-16 (cycle 8) · **Gate Status**: CONCERNS

## Executive Summary

Gate-7's six items are all verified on the head. The reviewer found that the assertion which replaced `jobBlock()`'s test is itself tautological (a job-blind reader passes it), plus two comments that no longer match the code. Nothing reads any workflow wrongly; the reader is stable. One small fix cycle.

## Re-Review Context

| Gate-7 finding | Status | Verification on head `cfa79c95` |
| --- | --- | --- |
| CR-1 date-like scalar | FIXED | `env: { RELEASE: 2026-01-01 }` parses; dated fixture green |
| CR-2 spawn message | FIXED | `PATH=/nonexistent` → "python3 could not be started … ENOENT" |
| CR-3 single command under comment | FIXED | dated fixture asserts `npm run bundle:check` |
| CR-4/5/6 cleanups | DONE | docstring gone; `jobBlock` gone; suite 0.5 s |

## New Findings This Cycle

- **[medium]** `:367` — replacement leak guard `steps.length <= allSteps.length` is tautological (reviewer probed a job-blind reader: 3 ≤ 3) **→ gate CR-1**
- cleanup `:276` — `stepsOfJob()` docblock describes the pre-cycle-7 rule
- cleanup `:39` — header says "exactly four things"; `classify()` has the `SETUP_ACTIONS` prefix path as well

## Final Assessment

**Gate Status**: CONCERNS — one MEDIUM; maintainability CONCERNS. **Quality Score**: 90/100. **Deployment**: CONDITIONAL — CR-1 fixed (cleanups ride along), cycle 9 re-review.

# QA Report: Task 266 - create-task asks the questions its checks miss

**Task**: [Link to task document](./task.266.create-task-asks-the-questions-its-checks-miss.md)
**Gate File**: [task.266.gate.3.create-task-asks-the-questions-its-checks-miss.yml](./task.266.gate.3.create-task-asks-the-questions-its-checks-miss.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 closes the one open item from the PR review (PC-1): the wall-time criterion is now measured. The median of five alternating `npm test` runs is 733.2 s on the PR head and 737.1 s on `develop`, a difference of -0.5%, inside the 10% bound.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools. Re-review scope: files changed since gate 2 (head 79d4076c5863): only task documents and the PR review report, no code and no prose source. Step 3b: not applicable (no reviewable code). Step 4b: not applicable (no fenced bash block added).

CI on aacfcc2305ce: green.

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| PC-1 (PR review 1): Performance criterion unmeasured | FIXED: measurement below |

## New Findings This Cycle

None. Searched: the five-run measurement, both arms' logs (exit status, failing tests) and the one failing run.

---

## Performance Criterion Measurement

Command, per run, from a clean worktree of each arm: `CI=true npm test`. Arms: PR head `aacfcc23` and `develop` `1f014f1c`, in separate `git worktree` checkouts sharing one `node_modules`. Runs alternated head, develop, five pairs, on a 16-core laptop that was busy with other work. `uptime` 1-minute load is recorded before and after each run.

| Pair | Arm | Wall time (s) | Exit | Load before | Load after |
| --- | --- | --- | --- | --- | --- |
| 1 | head | 739.5 | 0 | 8.25 | 11.24 |
| 1 | develop | 766.7 | 0 | 11.24 | 10.05 |
| 2 | head | 733.2 | 0 | 10.05 | 11.49 |
| 2 | develop | 755.7 | 0 | 11.49 | 8.36 |
| 3 | head | 734.7 | 0 | 8.36 | 7.33 |
| 3 | develop | 737.1 | 1 | 7.33 | 9.45 |
| 4 | head | 728.1 | 0 | 9.45 | 7.47 |
| 4 | develop | 737.1 | 0 | 7.47 | 8.22 |
| 5 | head | 724.5 | 0 | 8.22 | 6.39 |
| 5 | develop | 665.3 | 0 | 6.39 | 7.92 |

- **Median, head**: 733.2 s (sorted 724.5, 728.1, 733.2, 734.7, 739.5).
- **Median, develop**: 737.1 s (sorted 665.3, 737.1, 737.1, 755.7, 766.7).
- **Difference**: head is 0.5% faster. The bound is within 10%.
- **Outliers, reported not dropped**: develop pair 5 (665.3 s) is 10% below the develop median, in a pair where load was lowest. Head's range is 724.5 to 739.5 s.
- **Load**: every run ran at a 1-minute load of 6.4 to 11.5 on 16 cores, no ceiling breach worth excluding a run; the figures are comparable across arms because they alternated.

**The one failed run.** Pair 3, develop, exited 1: `tests/bundle-missing-source.test.js` took 20188 ms against its 20000 ms budget (the test labels itself LOAD-SENSITIVE). It is unrelated to this change (develop arm, prose-only diff). Re-run alone on the head it passes (7 of 7, 18478 ms). Its wall time (737.1 s) is kept in the sample because the suite ran to completion. Recorded as a future action: the file runs close to its budget even when idle.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Five items present and firing | PASS | QA report 1 |
| Controls unflagged | PASS | QA report 1 |
| Finalise prompt names run count and statistic | PASS | `shared/resources/finalise-dod-ac-prompt.md:72` |
| `npm test` within 10% of develop, median of five alternating, `uptime` beside each | PASS | the table above: 733.2 s vs 737.1 s, -0.5% |
| Contract tests, `bundle --check`, `quick_validate`, no restated section list | PASS | QA reports 1 and 2 |

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0.

## NFR Assessment

Performance PASS (measured above). Reliability PASS. Security PASS (reasoned, no boundary). Maintainability PASS.

## Code Review

Not applicable: no reviewable code in the diff.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The last unmet criterion is measured and met; no open findings.
**Quality Score**: 97/100
**Deployment Recommendation**: APPROVED

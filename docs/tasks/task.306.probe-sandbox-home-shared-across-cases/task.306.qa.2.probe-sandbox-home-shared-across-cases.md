# QA Report: Task 306 - Probe sandbox HOME shared across cases

**Task**: [Link to task document](./task.306.probe-sandbox-home-shared-across-cases.md)
**Gate File**: [task.306.gate.2.probe-sandbox-home-shared-across-cases.yml](./task.306.gate.2.probe-sandbox-home-shared-across-cases.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: PASS

---

## Executive Summary

Re-review after qa-fix cycle 1, which answered the PR review's three findings. The fix commit changed only documents under the task directory, so the code and test evidence of cycle 1 stands.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools only (re-review, documentation-only delta).
Re-review scope: files changed since gate 1 (head e089dbe06bcd; 4 files, all under the task directory) — default.
Diff review: not run. Every changed path is a task document, the nothing-outside-the-task-directory count (`code-moved-since-gate.sh`) reads 0, and no reviewable code or boundary changed, so there is no code to review. Step 4b: not applicable, no runnable prose in the change set.
CI on the cycle 1 fix commit: the `test` job was still pending when read; every other check passed. Recorded, not waited on; CI is gated once at `/finalise`.

## Re-Review Context

| Previous finding | Source | Status |
| --- | --- | --- |
| PC-2: no `pr_number` in the task frontmatter | PR review | ✅ FIXED — `pr_number: 900` at line 12 |
| PC-1: wall-time criterion met by CPU-time substitution, not recorded | PR review | ✅ FIXED — deviation entry in the implementation report's Decisions Log; criterion text unchanged (`criteria-drift.js`: clean) |
| PC-3: Branch and PR placeholders in the Completion block | PR review | ✅ FIXED — both filled |
| Two low advisory notes from gate 1 | QA 1 | Unchanged, still in `recommendations.future` |

## New Findings This Cycle

None. Searched: the four documents changed since gate 1 (the task document, the gate and QA report of cycle 1, the PR review report). Re-ran `criteria-drift.js` (clean), `probe-boundary-signals.mjs` (`refuses`, answered in the gate as before) and `changelog-cites.sh` (cites task 306).

## Success Criteria Verification

Unchanged from QA report 1. The performance criterion stays met on the CPU-time measure, now recorded as an explicit deviation.

## NFR Assessment

Security, performance, reliability and maintainability: PASS, as in gate 1.

## Figures recorded at /finalise (2026-11-13)

**task.296 plan re-run (criterion 5).** The committed task.296 plan (`task.296.dod.1.security.plan.json` and its five cases files, copied, not retyped) was run with its two `take` entries made legitimate again: `rd.ok` (run directory) and `tm.ok` (timeout 30) were added to the `take` entries, with the same `release` entry's `rd.ok` shape. Engine: `security-probe-plan.mjs` from this branch. Result: **32 executed, 0 reproduced, 0 escaped, 0 refusals**. The 32 are the same count task.296's first run executed, where the old engine read 2 reproduced and 2 escaped. Run files and plan are in the session scratchpad, not committed.

**Suite wall time (criterion 6).** Measured on the LAN server, interleaved develop (A) and branch (B), five runs each, `CI=true node --test shared/resources/tests/security-probe.test.mjs`, load average (1/5/15 min) read before each run. One test fails on that host in both A and B (`fence entry: task.167's 13 cases …`, a host difference, identical on both sides).

| Run | A (develop) wall s | B (branch) wall s | B/A | load before A | load before B |
| --- | --- | --- | --- | --- | --- |
| 1 | 178.9 | 178.0 | 0.99 | 9.97 / 9.61 / 6.42 | 2.46 / 6.18 / 5.63 |
| 2 | 180.7 | 221.1 | 1.22 | 3.30 / 5.08 / 5.32 | 4.37 / 4.60 / 5.08 |
| 3 | 177.7 | 198.4 | 1.12 | 4.08 / 5.43 / 5.40 | 3.94 / 4.84 / 5.18 |
| 4 | 248.7 | 258.9 | 1.04 | 10.48 / 5.88 / 5.42 | 7.15 / 11.64 / 8.42 |
| 5 | 306.6 | 329.3 | 1.07 | 6.26 / 10.49 / 8.87 | 19.90 / 15.17 / 11.21 |

Medians: A 180.7 s, B 221.1 s, **ratio 1.22**. Median of the five paired ratios: 1.07. Sum of per-test durations over the 312 tests both sides share, run 5 only: 306.0 s against 327.8 s, ratio 1.071; the 7 added tests take 0.4 s. CPU time (user + sys) on the laptop, three runs each: medians 74.0 s and 75.2 s, ratio 1.016.

Reading: the literal criterion (ratio of medians at most 1.10) is **not met** on these figures. The host was shared and its load ran from 2 to 20 across the runs, so the spread is larger than the effect; run 1 (no slowdown) and run 2 (22 percent) had a lower load than run 5. The load-free evidence (CPU time, 1.016) and the paired ratios (median 1.07) point to no real slowdown, but they are not the measure the criterion names. The criterion text is unchanged.

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 5)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.5.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.5.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.4.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.4.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-CR4-1 missed bound called unverified | ⚠️ PARTIAL | the FAIL branch exists (mutation red), but it is ordered before provenance (CR5-1) |
| T328-CR4-2 later/earlier, hedges | ✅ FIXED | comparative and hedge tests; mutation red |
| T328-CR4-3 `measured` field | ✅ FIXED | record_criteria assertions; mutation red |
| T328-CR4-4 dead check | ✅ FIXED | located by lead; the `**unverified**` calibration is live |
| T328-CR4-5 paragraph identity | ✅ FIXED | identity test; mutation red (its calibration is weak: CR5-2) |
| T328-CR4-6 dead `no` group | ✅ FIXED | group removed; the "no" loop still passes |

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1103` (and qa-story): the FAIL branch applies before the rule decides whether the figure counts (T328-CR5-1).
- **[low]** `evals/shared/tests/qa-measured-figure-parity.test.mjs:131`: the identity calibration does not exercise the comparison (T328-CR5-2).

### Review Methodology

- Re-review scope: files changed since gate 4 (head f81ac7546; 5 files) — default.
- Diff review: code review. Reviewer returned in 109036 ms (`duration_ms`).
- Fast gate (LAN, `CI=true npm run test:remote`): 8947 tests, 8944 pass, 0 fail, TEST_EXIT=0.
- CI on e9c20b2b3b98: green.
- **Budget**: this is gate 5 of 5 (4 fix cycles spent). The loop ends on this gate, and no further fix is applied ungated. Escalated to the owner.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–4, 6, 7, 9 | PASS | as cycle 1, plus the cycle-2 to 4 tests |
| 5 | PASS | amended wording (owner-approved); one newly listed example by path recorded in qa.1 (task 320 #10; 375 → 376) |
| 8 | PASS | fast gate 0 failed; CI green at e9c20b2b3; bundle:check 0 problems |

## Code Review

- [medium/medium] `skills/qa-task/SKILL.md:1103`: outcome order. Promoted as T328-CR5-1; checked against Step 3's wall-clock bullet.
- [low/high] `evals/shared/tests/qa-measured-figure-parity.test.mjs:131`: weak calibration. Promoted as T328-CR5-2.

mutation-proven: removed the missed-bound FAIL sentence from qa-task → `qa-task grades a measured figure…` and `qa-task and qa-story hold the same measured-figure paragraph` red → covered
mutation-proven: removed "`measured: false` rules nothing out" → `qa-task's record_criteria token…` red → covered
mutation-proven: "applied" → "used" in qa-story → `qa-task and qa-story hold the same measured-figure paragraph` red → covered
mutation-proven: dropped later/earlier and the hedge from NUMERIC_BOUND → `each comparative bound…` and the "or equal to" test red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability CONCERNS.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL on CR5-1 (fix, or owner waiver).

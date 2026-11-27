# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 7)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.6.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.6.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-QA6-1 criterion 4 wording | ✅ FIXED | parity check requires `**unverified** with "re-measure"`; dropping it from qa-task turned the qa-task and identity tests red |
| T328-CR6-1 mapping undeclared | ✅ FIXED | "unverified on purpose" asserted and calibrated |
| T328-CR6-2 "whatever its value" | ✅ FIXED | dropping it from qa-story turned the qa-story and identity tests red |
| T328-CR6-3 duplicated locator | ✅ FIXED | one `leadParagraphs` helper |

## New Findings This Cycle

- None blocking. One advisory: the reason-list guard matches only the hyphenated engine tokens (reviewer CR-1, low severity, low confidence). Recorded under future recommendations.

### Review Methodology

- Re-review scope: files changed since gate 6 (head dcbdab636; 3 files) — default.
- Diff review: code review, checked against finalise Step 3 **and the task's success criteria** (obs #195). Reviewer returned in 76723 ms (`duration_ms`).
- Fast gate (LAN, `CI=true npm run test:remote`): 8951 tests, 8948 pass, 0 fail, TEST_EXIT=0.
- CI on 5fbd51264753: green.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–3 | PASS | engine and comparative tests (qa.1, extended in cycles 2–4) |
| 4 | PASS | both skills cite Step 3 and state "unverified with re-measure"; the parity test fails on a lost citation or a restated reason |
| 5 | PASS | amended wording (owner-approved); the one newly listed example by path is in qa.1 (task 320 #10; 375 → 376) |
| 6, 7 | PASS | red-first runs in qa.1; mutation tables in qa.1–qa.7 |
| 8 | PASS | fast gate 0 failed; CI green at 5fbd51264; bundle:check 0 problems |
| 9 | PASS | CHANGELOG `[Unreleased]` cites task 328 |

## Code Review

- [low/low] `evals/shared/tests/qa-measured-figure-parity.test.mjs:41`: the reason guard sees only token forms. Advisory; future.

mutation-proven: dropped "re-measure" from qa-task → `qa-task grades a measured figure…` red → covered
mutation-proven: dropped "whatever its value" from qa-story → `qa-story grades a measured figure…` red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability PASS.

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment**: READY.

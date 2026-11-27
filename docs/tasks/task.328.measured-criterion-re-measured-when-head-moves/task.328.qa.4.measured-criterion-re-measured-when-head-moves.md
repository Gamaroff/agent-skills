# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 4)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.4.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.4.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.3.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.3.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-CR3-1 "re-measure" for every rejection | ✅ FIXED | parity check rejects "re-measure"; its mutation turned the qa-task test red |
| T328-CR3-2 measured as classification | ✅ FIXED | record_criteria assertion; mutation red |
| T328-CR3-3 lower/higher/bigger | ✅ FIXED | comparative loop; mutation red |
| T328-CR3-4 narrow guard | ✅ FIXED | Step 3 verbatim calibration; mutation red |

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1103` (and qa-story): a figure that misses its bound is called unverified. Step 3 grades it FAIL (T328-CR4-1).
- **[low]** later/earlier and hedged numbers are missed (CR4-2). The `measured` field is not listed, and `false` is read as final (CR4-3). One dead check (CR4-4). No identical-paragraph parity (CR4-5). A dead `no` group (CR4-6).

### Review Methodology

- Re-review scope: files changed since gate 3 (head 77c4e7dcc; 5 files) — default.
- Diff review: code review. Reviewer returned in 107636 ms (`duration_ms`).
- Fast gate (LAN, `CI=true npm run test:remote`): 8943 tests, 8940 pass, 0 fail, TEST_EXIT=0.
- CI on f81ac7546ff5: green.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–4, 6, 7, 9 | PASS | as cycle 1, plus the cycle-2/3 tests |
| 5 | PASS | amended wording (owner-approved); one newly listed example by path recorded in qa.1 (task 320 #10; 375 → 376) |
| 8 | PASS | fast gate 0 failed; CI green at f81ac7546; bundle:check 0 problems |

## Code Review

- [medium/medium] `skills/qa-task/SKILL.md:1103`: the outcome conflates FAIL and unverified. Promoted as T328-CR4-1; checked against Step 3 line 81.
- [low] CR4-2 … CR4-6, as listed in the gate.

mutation-proven: restored "re-measure" in qa-task → `qa-task grades a measured figure…` red → covered
mutation-proven: reverted record_criteria candidate wording → `qa-task's record_criteria token…` red → covered
mutation-proven: dropped lower/higher/bigger → `each comparative bound…` red → covered
mutation-proven: Step 3 head-or-M sentence added to qa-story → `qa-story grades a measured figure…` red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability CONCERNS.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL on CR4-1.

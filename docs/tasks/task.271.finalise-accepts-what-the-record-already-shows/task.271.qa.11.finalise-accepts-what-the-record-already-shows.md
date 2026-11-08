# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.11.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.11.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Gate 11 re-probed head `0bb75bf0`, unscoped. Cycle 10's findings are closed, and about 70 probes found no balanced pair on the gate side; the fence and comment handling held. Two medium holes remain, both in what the code treats as a record about the case.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 10 finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T271-QA-22 withdrawal in a non-action field | FIXED | refused in the committed test |
| T271-QA-23 fence closes on any marker | FIXED | refused in the committed test |

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-deferral-match.js:384` — a heading variant of the section name is read as another H2; reproduced, returns matched (T271-QA-24)
- **[medium]** `shared/resources/finalise-deferral-match.js:209` — a mention in `immediate[]` or a top-level key only offsets the raw count; reproduced, returns matched (T271-QA-25)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 6863-line branch diff; about 70 probes; it did not re-probe `finalise-delta.js`. The findings were reproduced by hand (three CLI runs). CR-3 (withdrawal wording is not machine-readable; `case` compared after trim) is advisory.

Scoring note: the rule gives 100 − 20 (security FAIL) − 10 − 10 (two CONCERNS) = 60. Gates 8 and 10 recorded 90 for the same NFR set; that was wrong and is corrected here.

mutation-proven: the cycle-10 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 3; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gate 9: about 30 delta probes, none got through |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-24, T271-QA-25 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (3 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8066 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the code names a fixed set of places that count as the record (an exact heading, the `future` list), and a withdrawal outside them is not blocked.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner.

# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.10.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.10.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (90/100)

---

## Executive Summary

Gate 10 re-probed head `28731ff9`, unscoped. Cycle 9's two findings are closed, and about 30 probes on the work-item side found no way to make the reconciliation disagree with itself. One hole is left, on the gate side: a withdrawal written in a field of a `future[]` entry other than `action` and `case` is read as parsed text and never blocks.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 9 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-20 multi-line comment | FIXED | refused in the committed test |
| T271-QA-21 id split by a comment | FIXED | refused in the committed test |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:209` — only `action` and `case` make a `future[]` entry a record about the case; a withdrawal in another field is read and counted but never blocks; reproduced, returns matched (T271-QA-22)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 6619-line branch diff; about 30 CLI probes; it did not re-probe `finalise-delta.js`. The finding was reproduced by hand (the gate and its control).

mutation-proven: the cycle-9 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 2; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gate 9: about 30 delta probes, none got through |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-22 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (2 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8064 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the gate decides whether an entry is about the case from two named fields, so a withdrawal in any other field never blocks.
**Quality Score**: 90/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner.

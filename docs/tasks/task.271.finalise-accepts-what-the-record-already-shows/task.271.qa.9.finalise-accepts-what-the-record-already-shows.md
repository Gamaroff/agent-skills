# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.9.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.9.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (80/100)

---

## Executive Summary

Gate 9 re-probed head `3fdc7d2e`, unscoped, and re-probed `finalise-delta.js` for the first time since gate 5: about 30 probes found nothing that exits 0 when it must refuse. Cycle 8's finding is closed. Two siblings remain in the Deferred Work reconciliation; both come from the section reader and the item reader handling HTML comments by different rules.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 8 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-19 heading hidden in a comment | FIXED | refused in the committed test; hidden fence also refused |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:352` — a multi-line comment makes the per-line section reader disagree with the item reader; reproduced, returns matched (T271-QA-20)
- **[high]** `shared/resources/finalise-deferral-match.js:334` — an id split by a comment exists only after stripping, giving slack on the taken side; reproduced, returns matched (T271-QA-21)

## Review Methodology

Re-review scope: unscoped, both engines. Reviewer: read-only Explore subagent over the 6469-line branch diff; about 15 deferral probes and about 30 delta probes. Both findings were reproduced by hand (two CLI runs).

mutation-proven: the cycle-8 mutation proof stands as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 2; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | about 30 delta probes, none got through |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-20, T271-QA-21 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (2 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8064 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two readers of one file strip HTML comments by different rules, and the difference hides a withdrawal.
**Quality Score**: 80/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner.

# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.8.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.8.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (90/100)

---

## Executive Summary

Gate 8 re-probed head `51321cb7`, unscoped. Cycle 7's two findings are closed. The reviewer ran about 20 crafted work-item and gate files and found one reproduced hole: the section boundary is computed from different text on the two sides of the work-item reconciliation.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 7 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-17 `#` in a block scalar | FIXED | refused in the committed test |
| T271-QA-18 work item not reconciled | FIXED | `+` bullet, numbered item, prose and table row refused |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:316` — a `## Notes` heading hidden inside an HTML comment ends the raw section early, so a withdrawal after it is not counted; reproduced, returns matched (T271-QA-19)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 6244-line branch diff; about 20 crafted files; it did not probe `finalise-delta.js`. The finding was reproduced by hand (two CLI runs). The second item (a withdrawal under another H2) is an owner decision, recorded as a recommendation.

mutation-proven: the cycle-7 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 2; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only` |
| Arm 2: one re-run, outside the diff | PASS | not re-probed at gates 6 to 8; earlier gates closed |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-19 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (2 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8064 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the work-item reconciliation finds the section boundary on text that differs from the text it counts items on.
**Quality Score**: 90/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner.

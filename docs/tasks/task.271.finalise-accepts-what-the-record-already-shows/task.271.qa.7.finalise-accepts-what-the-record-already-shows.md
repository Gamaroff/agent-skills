# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.7.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.7.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (80/100)

---

## Executive Summary

Gate 7 re-probed head `c5eb9dd8`, unscoped. Cycle 6's two findings are closed in their original shapes, and the count-offset attack the reviewer was asked to try did not reproduce. Two siblings remain: a `#` line inside a block scalar, and the work item, which is not reconciled.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 6 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-15 comment line hides a withdrawal | FIXED | refused in the committed test |
| T271-QA-16 earlier `future:` key | FIXED | refused in the committed test |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:221` — a `#` line inside a block scalar is stripped from the raw count; reproduced, returns matched (T271-QA-17)
- **[high]** `shared/resources/finalise-deferral-match.js:288` — only `-` and `*` bullets are read in Deferred Work; a `+` bullet and a prose line naming the case are ignored; reproduced, returns matched (T271-QA-18)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 5987-line branch diff; it did not re-probe `finalise-delta.js`. Both findings were reproduced by hand (three CLI runs); the numbered-item and table-row variants it reported were not.

mutation-proven: the cycle-6 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 3; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only` |
| Arm 2: one re-run, outside the diff | PASS | not re-probed this cycle; prior gates closed |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-17, T271-QA-18 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (3 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8063 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the reconciliation strips `#` lines that are text inside a block scalar, and the work item is read without any reconciliation.
**Quality Score**: 80/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner.

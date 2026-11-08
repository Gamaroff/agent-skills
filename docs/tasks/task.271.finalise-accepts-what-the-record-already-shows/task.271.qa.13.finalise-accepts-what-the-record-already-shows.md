# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.13.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.13.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Gate 13 re-probed head `87dd3fba`, unscoped. The cycle 12 redesign (Arm 3 reads the structured gate only) removed the Markdown surface, and no work-item finding was possible. One gate-side hole remains: a duplicate key in a gate entry is accepted, last one wins.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 12 finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T271-QA-26 heading spellings | CLOSED by removal | the work item is no longer read; `--work-item` exits 2 |
| T271-QA-27 withdrawal in a prose key | CLOSED by decision | a deferral is withdrawn by editing its entry |

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-deferral-match.js` — a duplicate key in a gate entry is accepted, last wins; three shapes reproduced, each returns matched (T271-QA-28)
- **[low]** `docs/reference/configuration.md:292` — says the approver match is case-insensitive; it is exact (T271-QA-29)

## Review Methodology

Re-review scope: unscoped, both engines. Reviewer: read-only Explore subagent over the 6741-line branch diff; about 50 scratch gates plus the item 5a block; `finalise-delta.js` spot-checked. QA-28 was reproduced by hand (three CLI runs); QA-29 was read in the file.

mutation-proven: the cycle-12 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 3; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gate 9 probes; spot-check at gate 13 |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-28 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (3 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8061 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: an ambiguous record (a repeated key) is accepted as an approval.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner. The fix is small: refuse a repeated key in the entry.

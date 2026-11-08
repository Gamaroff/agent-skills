# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.12.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.12.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Gate 12 re-probed head `b9fbb0cd`, unscoped. Cycle 11's findings are closed. What remains is one class: the work item is free-form Markdown, and the set of spellings that render as one section is open-ended. `finalise-delta.js` was reviewed line by line and nothing was reproduced.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 11 finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T271-QA-24 heading spellings | PARTIAL | closing hashes, case, spacing, emphasis fixed; entities, link wrappers, setext and H1/H3 still unread (T271-QA-26) |
| T271-QA-25 records outside `future[]` | FIXED | refused in the committed tests |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:322` — headings that render as the section (an entity, a setext heading, an H1) are not recognised, so the text under them is never read; three reproduced, returns matched (T271-QA-26)
- **[medium]** `shared/resources/finalise-deferral-match.js:194` — a withdrawal in an allow-listed gate prose key still matches; reproduced; an owner decision (T271-QA-27)

## Review Methodology

Re-review scope: unscoped, both engines. Reviewer: read-only Explore subagent over the 7233-line branch diff; about 40 probes through the matcher, and `finalise-delta.js` read line by line. All findings were reproduced by hand (four CLI runs).

mutation-proven: the cycle-11 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 4; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | about 30 delta probes at gate 9; line-by-line read at gate 12 |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-26 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (4 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8068 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a text matcher over free-form Markdown cannot be finished, because the spellings that render as one section are open-ended. The structured gate record has no such surface.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner. Recommendation: accept deferrals from the structured gate record only.

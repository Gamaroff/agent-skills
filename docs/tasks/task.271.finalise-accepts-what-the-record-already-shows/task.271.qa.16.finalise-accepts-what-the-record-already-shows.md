# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.16.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.16.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Gate 16 re-probed head `b749f3a9`, unscoped, with a thorough reviewer (about 75 probes compared with a real YAML reader). Cycle 15's fixes hold. The gap between the hand-rolled subset parser and real YAML is wide: five wrong matches were reproduced by hand.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 15 finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T271-QA-32 glued `#` | FIXED | `Pat#z` is unapproved in the committed tests |
| T271-QA-33 row after the body | FIXED | unverifiable in the committed tests |

## New Findings This Cycle

- **[high]** escapes in double-quoted values are never decoded, so a competing record is invisible; reproduced, returns matched (T271-QA-34)
- **[high]** a root row the parser cannot read is dropped when it has no children (`? recommendations`, `!!str recommendations: {...}`); reproduced, returns matched (T271-QA-35)
- **[high]** a lone CR, NEL, LS or PS is a line break to YAML but not to the parser; reviewer-reproduced, my one attempt returned unverifiable (T271-QA-36)
- **[medium]** a non-breaking space before `#` is treated as a comment separator; reproduced, returns matched (T271-QA-37)
- **[medium]** a multi-document stream is accepted; reproduced, returns matched (T271-QA-38)

## Review Methodology

Re-review scope: unscoped, both engines. Reviewer: read-only Explore subagent, about 75 probes (60 gate variants compared with PyYAML, 15 `finalise-delta.js` runs, old versus new lenient parse of 1089 YAML files). Five findings reproduced by hand with six CLI runs. `finalise-delta.js`: no defect found.

mutation-proven: the cycle-15 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 6; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gate 9 probes; gate 16 runs |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | five shapes reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (6 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8067 tests, 0 failed)
- **Maintainability** — FAIL

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the deferral facts are read through a parser whose rules differ from YAML in many places. Each cycle since gate 11 has closed one spelling and found the next.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner. Recommendation: move the facts to a JSON record read with `JSON.parse`, or ship Arms 1 and 2 and make Arm 3 its own task.

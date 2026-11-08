# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.15.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.15.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Gate 15 re-probed head `89f46d3f`, unscoped. Cycle 14's fixes hold and no other parser consumer changed (1088 tracked YAML files parse identically with no options). One hole remains in a new place: the parser's comment rule.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 14 finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T271-QA-30 rows the parser drops | FIXED | refused in the committed tests |
| T271-QA-31 `__proto__` key | FIXED | refused in the committed tests |

## New Findings This Cycle

- **[medium]** `shared/resources/yaml-subset.js:27` — a `#` glued to a scalar is cut as a comment, which YAML does not do; a gate with four glued suffixes returns matched; reproduced (T271-QA-32)
- **[low]** `shared/resources/yaml-subset.js:106` — a row shallower than the block ends the root mapping; not reproduced as a wrong match (T271-QA-33)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 7328-line diff (bundled parser copies excluded); five tool calls. QA-32 was reproduced by hand. QA-33 was attempted by hand and returned `unverifiable`. `finalise-delta.js` was not examined.

mutation-proven: the cycle-14 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 2; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gate 9 probes; spot-checks through gate 13 |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-32 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (2 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8065 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the parser's comment rule differs from YAML's, so a value carrying a glued `#` is truncated into one that approves.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner. The fix is small: in strict mode a `#` starts a comment only after whitespace.

# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.14.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.14.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Gate 14 re-probed head `91e83b8a`, unscoped. Cycle 13's repeated-key fix holds for plain keys and no committed gate is wrongly refused (987 checked). The same class remains one level down: the subset parser silently drops rows it cannot read and stores a `__proto__` key on the prototype.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Re-Review Context

| Cycle 13 finding | Status | Evidence |
| ---------------- | ------ | -------- |
| T271-QA-28 repeated key | PARTIAL | plain repeats refused; a complex key, an odd-indent row and `__proto__` still pass (T271-QA-30, T271-QA-31) |
| T271-QA-29 doc cell | FIXED | cell reads exact and case-sensitive |

## New Findings This Cycle

- **[medium]** `shared/resources/yaml-subset.js:131` — a row the parser does not consume is dropped, so an override in that spelling is never checked; two shapes reproduced, each returns matched (T271-QA-30)
- **[low]** `shared/resources/yaml-subset.js:99` — a `__proto__` key supplies facts through the prototype; reproduced, returns matched (T271-QA-31)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 9376-line branch diff (mostly mechanical bundled copies); about 20 mutated gates and the matcher on 987 committed gates. All three findings were reproduced by hand. `finalise-delta.js` was not examined.

mutation-proven: the cycle-13 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 3; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gate 9 probes; spot-checks through gate 13 |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-30 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (3 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8063 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the strict mode checks the keys the parser reads, not the rows it skips.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner. The fix is one rule: in strict mode, fail closed on any row the parser does not consume.

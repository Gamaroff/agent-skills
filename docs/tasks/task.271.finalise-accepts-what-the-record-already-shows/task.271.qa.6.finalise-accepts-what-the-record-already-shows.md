# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.6.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.6.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL (80/100)

---

## Executive Summary

Gate 6 (the owner-granted extra cycle) re-probed the surface on head `57933dc8`, unscoped. Cycle 5's two findings are closed in their original shapes. The check added for T271-QA-13 can itself be defeated two ways, and both reproduced.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 5 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-13 block scalar withdrawal | PARTIAL | original shape refused; a column-0 comment or an earlier `future:` key hides it (T271-QA-15, T271-QA-16) |
| T271-QA-14 approver markup | FIXED | `sam_`, `sam*` refused; wrapper pairs still match |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:243` — the scan ends at a column-0 comment line inside the block; reproduced, returns matched (T271-QA-15)
- **[high]** `shared/resources/finalise-deferral-match.js:233` — the first `future:` key in the file is scanned, not `recommendations.future`; reproduced, returns matched (T271-QA-16)

## Review Methodology

Re-review scope: unscoped. Reviewer: read-only Explore subagent over the 5754-line branch diff; it ran the deferral CLI on scratch gates and did not run the CRLF, tab, fenced-code or git-state cases. CR-1 and CR-2 were reproduced by hand (three gates, one control); CR-3 (false block on a comment naming the id) is advisory.

mutation-proven: the cycle-5 mutation proofs stand as recorded in the implementation report.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 6; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only` |
| Arm 2: one re-run, outside the diff | PASS | symlink, directory and subdirectory cases closed |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-15, T271-QA-16 reproduced |
| Performance: within 10% of develop | UNMEASURED | clean rerun owed |

## NFR Assessment

- **Security** — FAIL (6 runs; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8062 tests, 0 failed)
- **Maintainability** — CONCERNS

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the unread-line check is a heuristic over line shape; it still lets a withdrawal through when a comment line or an earlier `future:` key hides it.
**Quality Score**: 80/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the budget is spent; the pipeline halts for the owner.

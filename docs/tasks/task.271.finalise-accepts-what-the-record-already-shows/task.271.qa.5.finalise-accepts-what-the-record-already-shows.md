# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.5.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.5.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: FAIL (70/100)

---

## Executive Summary

Cycle 5 (the last gate in the budget) re-probed the whole surface on head `22429587`, unscoped. Cycle 4's three findings are closed. Two new fail-open paths remain in the Arm 3 matcher.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 4 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-10 bold slot prose | FIXED | the grammar has no optional slot; refused controls committed |
| T271-QA-11 symlink to a changed file | FIXED | regular-file mode check; symlink test |
| T271-QA-12 later revocation ignored | FIXED | every record that names the case must approve |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:226` — a block-scalar gate entry is truncated by the subset parser, so a withdrawal in it is ignored; reproduced, CLI returns matched (T271-QA-13)
- **[medium]** `shared/resources/finalise-deferral-match.js:137` — trailing `_` or `*` stripped from the approver, so `sam_` equals `sam`; reproduced (T271-QA-14)

---

## Review Methodology

Re-review scope: unscoped (prior gate failed on security). Reviewer: read-only Explore subagent over the 5441-line branch diff. CR-1 and CR-2 were reproduced by hand; CR-3 to CR-5 were not reproduced by me and are recorded as advisory. No new probe-engine cases were authored this cycle; the cycle-4 cases were run last cycle and their findings no longer reproduce.

CI on `22429587`: not read as a decided state this cycle.

mutation-proven: the cycle-4 mutation proofs (exact approver compare, every-record rule, regular-file check) stand as recorded in the implementation report.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only` |
| Arm 2: one re-run, outside the diff | PASS | symlink and directory gaps closed; non-ASCII names fail closed |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-13, T271-QA-14 reproduced |
| Performance: within 10% of develop | UNMEASURED | loaded machine; clean rerun owed |

## NFR Assessment

- **Security** — FAIL (4 CLI runs this cycle; 0 escapes)
- **Performance** — CONCERNS
- **Reliability** — PASS (`ci:fast` 8060 tests, 0 failed)
- **Maintainability** — CONCERNS

## Code Review

**Correctness bugs (5):**
- [high/high] `shared/resources/finalise-deferral-match.js:226` — block scalar truncates a gate entry (gate T271-QA-13)
- [medium/medium] `shared/resources/finalise-deferral-match.js:137` — name stripped of `_`/`*` (gate T271-QA-14)
- [medium/high] `shared/resources/finalise-delta.js:228` — ls-tree without `-z`, non-ASCII names fail closed → advisory
- [medium/medium] `shared/resources/finalise-deferral-match.js:226` — a mention of the id blocks an approved deferral → advisory
- [low/medium] `shared/resources/finalise-deferral-match.js:279` — a nested list item is read as a record → advisory

boundary: true; boundary_signals: ["refuses"]; probes_executed: 4; escaped: 0.

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Arm 3 still accepts a deferral when a withdrawal is written as a YAML block scalar, and when the approver carries a trailing underscore.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: the five-gate budget is spent; the pipeline halts for the owner.

# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change (cycle 5)

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.5.qa-reentry-after-finalise-gaps.yml](./task.170.gate.5.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 — the last budgeted — at `9915dd93` (local; cycle 4's commit was held unpushed by the
fast-gate bound), scoped to the 8 non-generated files changed since gate 4. The cycle-4 routes hold:
every caller passes the now-required report, and the contract, the halt-7 bullet and both SKILL.md
paragraphs agree on every route (52/52, parity 5/5). One medium remains: `report_entries` is a raw
heading count, and the resume's own reconstruction back-fills headings for gates without entries.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1, CR-2 (cycle 4) refusal routes | FIXED | one route per reason, cited; parity route test; untracked-refusal mutation → 3 red |
| CR-3 (cycle 4) precedence key numbering | PARTIAL | counted, not numbered — but the count ignores back-fill (this cycle's CR-1) |
| CR-5 (cycle 4) stale prose | FIXED | CHANGELOG, suite header, criteria |

## New Findings This Cycle

- **[medium]** `shared/resources/reenter-qa-after-finalise.sh:215` — `report_entries` is the raw heading count; reconstruction back-fills headings for gates without entries, so with the report behind the gates the precedence clears early ([bug.5](./task.170.bug.5.reentry-precedence-clears-before-entry.md), reopened). Reviewer: high / medium confidence. QA verified the back-fill rule and calibrates **medium**: two preconditions (a report behind the gates at re-entry, an interruption in the window), and the wrong route lands at 5c, where `/review-pr` still reads the diff.
- Advisory: CR-2 — the precedence's "5a overwrites the in-flight gate" is false; the reconstruction back-fills it and continues from it.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer (184344 ms, `duration_ms` from its completion
notice). `code_review_blocking=true`. `SAFETY_REPROBE=false`.

Re-review scope: files changed since gate 4 (head eef60e45; 8 files) — default

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (1 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR-1.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged.
### Maintainability — PASS

---

## Code Review

**Correctness bugs (2):**
- [high→medium, QA-calibrated / medium→verified] `shared/resources/reenter-qa-after-finalise.sh:215` — raw heading count vs back-fill. **Promoted (CR-1).**
- [medium/medium] `shared/resources/develop-pipeline-resume-contract.md:449` — in-flight gate parenthetical. Advisory (CR-2).

mutation-proven: refuse on untracked files → 3 untracked cases went red → covered
mutation-proven: `report_entries` ← gate base → "report behind" case went red → covered
mutation-proven: `uncommitted-fix` routed to the next bullet → parity route test went red → covered

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

**Next Steps**: `/qa-fix` cycle 5 (the budget's last), then Loop Escalation decides.

# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change (cycle 4)

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.4.qa-reentry-after-finalise-gaps.yml](./task.170.gate.4.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 at `eef60e45`, scoped to the 7 non-generated files changed since gate 3. No HIGH. Cycle 3's
re-keying and committed-history measure hold (47/47), but the refusal routes now disagree: the
contract sends `uncommitted-fix` to Step 7 while everything else says never, and an untracked file
blocks `no-code-moved` on a healthy branch. `base_cycle` mixes a heading count with gate numbering.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 3) precedence cleared before entry N+1 | PARTIAL | re-keyed on `base_cycle`, single statement; CR-3 below shows the key's numbering mismatch |
| CR-2/CR-4 (cycle 3, advisory) uncommitted / untracked movement | PARTIAL | committed-history measure in; CR-1/CR-2 below on the routes |
| CR-3 (cycle 3, advisory) sub-story stem | FIXED | stem read from DoD files; sub-story case |
| CR-5 (cycle 3) schema readers | FIXED | schema names both readers |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:206` — a refused re-entry, `uncommitted-fix` included, routes to Step 7 ([bug.6](./task.170.bug.6.refusal-routes-disagree.md)).
- **[medium]** `shared/resources/reenter-qa-after-finalise.sh:175` — untracked-only movement refused; document-only fix beside held-aside files cannot reach `no-code-moved` ([bug.6](./task.170.bug.6.refusal-routes-disagree.md)).
- **[low]** `shared/resources/reenter-qa-after-finalise.sh:185` — `base_cycle` is a heading count vs gate-numbered entries ([bug.5](./task.170.bug.5.reentry-precedence-clears-before-entry.md), reopened).
- **[low]** `CHANGELOG.md:16` — CHANGELOG entry and suite header describe the cycle-1 measure.
- Advisory: CR-4 parent-stem match when a parent DoD sits in a sub-story directory (rationale in the gate).

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer (238041 ms, `duration_ms` from its completion
notice). `code_review_blocking=true`. `SAFETY_REPROBE=false`.

Re-review scope: files changed since gate 3 (head 4da0cee9; 7 files) — default

The first scoped diff came out empty: the file list was expanded unquoted under zsh, the trap the
scope block documents (one newline-joined pathspec). Rebuilt with an array before dispatch (890 lines).

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2 (1 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR-1, CR-2, CR-3.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged.
### Maintainability — CONCERNS
CR-5.

---

## Code Review

**Correctness bugs (5):**
- [medium/high] `shared/resources/develop-pipeline-resume-contract.md:206` — refusal routes. **Promoted (CR-1).**
- [medium/high] `shared/resources/reenter-qa-after-finalise.sh:175` — untracked-only refusal. **Promoted (CR-2).**
- [low/high] `shared/resources/reenter-qa-after-finalise.sh:185` — `base_cycle` numbering. **Promoted (CR-3).**
- [low/medium] `shared/resources/reenter-qa-after-finalise.sh:131` — parent-stem match. Advisory (CR-4).
- [low/high] `CHANGELOG.md:16` — stale prose. **Promoted (CR-5).**

mutation-proven: dirty-tree refusal → `true` → 2 uncommitted cases went red → covered
mutation-proven: stem dot rule → `"$p"*` → "a task.42 DoD inside task.420.other …" went red → covered
mutation-proven: `base_cycle` dropped from the write → base_cycle case went red → covered
mutation-proven: bug-prefix exclusion line removed → nothing red → no-red-dead (line deleted)

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — CR-1, CR-2 fixed

**Next Steps**: `/qa-fix` cycle 4, then QA cycle 5 (the last budgeted cycle).

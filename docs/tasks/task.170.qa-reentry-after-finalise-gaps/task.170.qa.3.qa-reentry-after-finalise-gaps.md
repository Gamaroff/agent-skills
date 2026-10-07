# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change (cycle 3)

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.3.qa-reentry-after-finalise-gaps.yml](./task.170.gate.3.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 at `4da0cee9`, scoped to the 7 non-generated files changed since gate 2. Cycle 2's fixes hold
(suite 40/40, parity 4/4). The resume precedence added for TASK-170-BUG-3 keys on the gate head, and
`/qa-task` writes gate N+1 one step before 5a writes entry N+1 — so a narrow window remains in which
a resume reads the pre-re-entry APPROVE. One medium finding; four advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 2) resume reads the stale APPROVE | PARTIAL | precedence added; window narrowed, not closed (this cycle's CR-1) |
| CR-2 (cycle 2) parallel-story stem | FIXED | parallel-story case; `-N` mutation red |
| CR-4 (cycle 2) absent budget as 0 | FIXED | default-budget case; `// 0` mutation red |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:444` — the precedence clears when gate N+1 is written, before entry N+1 exists → key it on `qa_reentry.base_cycle` and the highest entry ([bug.5](./task.170.bug.5.reentry-precedence-clears-before-entry.md)).
- Advisory: CR-2 untracked files after Step 4's held-file restore count as movement; CR-4 an uncommitted tracked fix is accepted but the re-entered 5a halts at qa-task Step 3b; CR-3 four-part sub-story stem; CR-5 schema names one reader of two.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer (274543 ms, `duration_ms` from its completion
notice). `code_review_blocking=true`. `SAFETY_REPROBE=false` (clause 1 from gate 2: security PASS).

Re-review scope: files changed since gate 2 (head cad6845b; 7 files) — default

Step 4b: the changed runnable prose (`develop-pipeline-resume-contract.md`, both `SKILL.md`) gained no
new fenced block this cycle — not re-run.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: The re-entry precedence clears one step early (CR-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.170.bug.5.reentry-precedence-clears-before-entry.md](./task.170.bug.5.reentry-precedence-clears-before-entry.md)
- **Recommendation**: key on the report (`base_cycle`), state once, cite from both rows.
- **Priority**: P2

### LOW Severity Issues (0 gated; 4 advisory, listed above)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR-1.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged since cycle 2.
### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `shared/resources/develop-pipeline-resume-contract.md:444` — precedence keyed on the gate head. **Promoted (CR-1).**
- [medium/medium] `shared/resources/reenter-qa-after-finalise.sh:149` — untracked files counted as movement. Advisory (CR-2).
- [low/medium] `shared/resources/reenter-qa-after-finalise.sh:118` — four-part sub-story stem. Advisory (CR-3).
- [low/medium] `shared/resources/reenter-qa-after-finalise.sh:148` — uncommitted fix accepted, re-entered 5a halts. Advisory (CR-4).

**Cleanups (1):**
- `shared/resources/develop-pipeline-pause.md:115` — two readers of `qa_reentry`, schema names one (CR-5).

mutation-proven: `(-[0-9]+)?` dropped → parallel-story case red → covered
mutation-proven: budget `// 5` → `// 0` → default-budget case red → covered
mutation-proven: precedence clause removed from the 5–6 rows → parity test red → covered

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4.

# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [task.242.scope-finalise-re-runs.md](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.5.scope-finalise-re-runs.yml](./task.242.gate.5.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-CR4-1: an ambiguous bare basename across HEAD and a gone path is resolved as exact and carried | medium | ✅ FIXED on the scope side | Every candidate resolves; tests "a gone path shares resolves to every candidate" and "ambiguous at the prior head re-judges"; 4 of 4 mutations `covered` |

---

## Executive Summary

The CR4-1 fix holds where it was aimed: prior-record citations. It was applied to the shared resolver, though, so it also reaches merge's new-member check, where the agent cites against HEAD and a gone path cannot be what it meant. QA reproduced the consequence: a same-basename deletion turns a new member on unchanged evidence from an advisory into a counted member.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Re-review, direct tools plus one independent Explore code reviewer (Step 3b).

Re-review scope: files changed since gate 4 (head 8419df32cbe2; 6 files) — default. `SAFETY_REPROBE=false` (gate 4 security PASS).

Reviewer: dispatched 08:03:26Z (`date -u`), returned in 75.3 s (`duration_ms`).

CI on 1146a0e7960f: pending

Step 4b: not applicable. No in-scope runnable prose changed this cycle.

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:159`: the gone-candidate widening reaches merge's new-member evidence (TASK-242-CR5-1) → resolve current-run citations against HEAD only.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phases 1-6 | PASS (18/18 items) | Phase 2 (the evidence rule) carries CR5-1 |

---

## Success Criteria Verification

The criteria verified in cycles 1-4 hold (142/142 on the targeted suites). CR5-1 breaks the §3 new-member rule on one path: a bare citation plus a same-basename deletion.

---

## Breaking Changes Validation

None. **PASS**

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: the gone-candidate rule reaches current-run citations (TASK-242-CR5-1)**

- **Severity**: MEDIUM (reviewer medium, confidence high; promoted by `code_review_blocking`)
- **Category**: Functional (reliability)
- **Observation**: `resolveCitation("b.js:3", evidenceIndex(["src/a.js","src/b.js"], new Set(["old/b.js"])))` returns `["src/b.js","old/b.js"]`, so the new member reads as `changed` and is counted. With nothing gone it returns `["src/b.js"]`: `unchanged`, so an advisory.
- **Impact**: §3's rule that a new member on unchanged evidence cannot fail a criterion stops holding whenever a same-basename file was deleted. That is the task.239 loop.
- **Recommendation**: resolve by provenance. A prior-record citation keeps the gone-candidate rule; a current-run citation resolves against HEAD.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS

Unchanged.

### Reliability — CONCERNS

CR5-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1-4.

### Maintainability — PASS

The merge side lacks a gone-basename test; the fix adds one.

---

## Code Review

Blocking for `bug` + confidence `high` (`code_review_blocking=true`).

**Correctness bugs (1):**

- [medium/high] `shared/resources/finalise-rerun-scope.js:159`: resolving to every candidate is right for scope, but merge feeds it citations this run's agent wrote against HEAD → give the gone-candidate expansion only to prior-record citations. Promoted to `top_issues[]`.

**Cleanups (0).**

Anchors: 1 of 1 `ok`.

Mutation proofs (scratch worktree at 1146a0e7):

- mutation-proven: back to HEAD-first → "a gone path shares resolves to every candidate", "ambiguous at the prior head re-judges" → covered
- mutation-proven: a single gone candidate only → "a gone path shares resolves to every candidate" → covered
- mutation-proven: gone ignored beside a unique HEAD hit → both tests → covered
- mutation-proven: control direction, every candidate even with nothing gone → "the shapes task.239's runs cited" and others → covered

All 4 of 4 fixes from cycle 4 are proven; the baseline was green and the worktree clean.

---

## Regression Testing

Targeted suites under `TMPDIR=/tmp`: 142/142. `ci:fast` before the cycle-4 commit: 6781 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed

```bash
TMPDIR=/tmp node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
node scratchpad/qa5/mut9.mjs   # in a scratch worktree
node -e 'resolveCitation("b.js:3", evidenceIndex(["src/a.js","src/b.js"], new Set(["old/b.js"])))'
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high finding; one promoted medium (CR5-1), verified by execution.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR5-1 fixed and re-reviewed.

**Next Steps**: qa-fix cycle 5 (the last budgeted cycle): CR5-1.

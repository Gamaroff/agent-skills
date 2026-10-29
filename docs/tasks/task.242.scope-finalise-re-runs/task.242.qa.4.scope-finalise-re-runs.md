# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [task.242.scope-finalise-re-runs.md](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.4.scope-finalise-re-runs.yml](./task.242.gate.4.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-CR3-1: a same-basename directory move makes a bare citation ambiguous, so the criterion is carried | high | ✅ FIXED | `evidenceIndex` keeps `goneByBase` separate and HEAD wins. Test "a bare-cited file moved or deleted under its own basename re-judges"; 4 mutations `covered` |
| CR3-2 (advisory): `git diff` C-quotes non-ASCII paths | low | ✅ FIXED | `-z` throughout; test "a non-ASCII path reaches changed and dirty unquoted", `covered` |
| CR3-3, CR3-4 (cleanups) | low | ✅ FIXED | Both dead guards removed |

---

## Executive Summary

All cycle-3 fixes are verified: 6 of 6 mutation proofs `covered`, run against the committed head in a scratch worktree. No high finding. The independent reviewer found one medium edge, which QA reproduced: a bare basename that HEAD and a gone path share is resolved as if it were exact, so the criterion is carried.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Re-review, direct tools plus one independent Explore code reviewer (Step 3b).

Re-review scope: files changed since gate 3 (head a43bee983bd7; 6 files) — default. `SAFETY_REPROBE=false` (gate 3 security PASS; clauses 2-3 do not apply).

Reviewer: dispatched 07:55:01Z (`date -u`), returned in 73.0 s (`duration_ms`).

CI on 8419df32cbe2: pending

Step 4b: not applicable. No in-scope runnable prose changed this cycle (no `SKILL.md` or `shared/resources/*.md` change).

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:156`: a bare basename that HEAD and a gone path share resolves to HEAD's file, and the criterion is carried (TASK-242-CR4-1) → resolve to every candidate whenever a gone path shares the basename.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phases 1-6 | PASS (18/18 items) | Phase 2 (the evidence rule) carries CR4-1 |

---

## Success Criteria Verification

The criteria verified in cycles 1-3 hold (141/141 on the targeted suites). CR4-1 is a narrow hole in the evidence-changed rule (Phase 2).

---

## Breaking Changes Validation

None this cycle. `evidenceIndex` is a new export; `trackedIndex` callers are unchanged, and a `tracked` index without `goneByBase` resolves as before. **PASS**

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: an ambiguous bare basename is resolved as exact (TASK-242-CR4-1)**

- **Severity**: MEDIUM (reviewer medium/medium; QA reproduced it, so the confidence is QA's from execution, not the reviewer's)
- **Category**: Functional (reliability)
- **Observation**: `resolveCitation("b.js:1", evidenceIndex(["src/b.js","src/a.js"], new Set(["old/b.js"])))` returns `["src/b.js"]`. At the prior head both files existed, so the citation was ambiguous and may have meant the deleted one. Two gone candidates (`x/b.js`, `y/b.js`) resolve to `[]`, and an unchanged co-citation then carries the criterion.
- **Provenance**: the HEAD-only resolution at 15185f81 behaves the same way, so this predates the cycle-3 fix. It is still this branch's (the engine is new on it), and it is the unsafe direction.
- **Recommendation**: whenever a gone path shares the basename, resolve the bare citation to every candidate, so the criterion counts as changed.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS

Unchanged.

### Reliability — CONCERNS

CR4-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1-3. The candidates are `resolveCitation` and `evidenceIndex`, a carry classifier over git state that writes no disk path, and no corpus sink fits.

### Maintainability — PASS

Both identity directions now have test pairs.

---

## Code Review

Advisory unless promoted (`code_review_blocking=true`; only bug + high confidence promote).

**Correctness bugs (1):**

- [medium/medium] `shared/resources/finalise-rerun-scope.js:156`: HEAD-first resolution carries a criterion whose bare basename matched a now-deleted file at the prior head → fail toward re-judge when a gone candidate shares the basename. Not promoted; entered in `top_issues[]` as a QA finding after QA reproduced it.

**Cleanups (0).**

Anchors: 1 of 1 `ok`.

Mutation proofs (scratch worktree at 8419df32):

- mutation-proven: gone paths merged into HEAD's basename map → "moved or deleted under its own basename" → covered
- mutation-proven: gone-path fallback removed → same test → covered
- mutation-proven: fallback ignores ambiguity → "HEAD wins a bare basename" → covered
- mutation-proven: fallback wins over HEAD → same test → covered
- mutation-proven: gone full paths not added to the index → "deleted or renamed since the prior head" → covered
- mutation-proven: diffs without `-z` → "a non-ASCII path reaches changed and dirty unquoted" → covered

All 6 of 6 fixes from cycle 3 are proven; the baseline was green and the worktree clean.

---

## Regression Testing

Targeted suites under `TMPDIR=/tmp`: 141/141. `ci:fast` before the cycle-3 commit: 6780 pass, 0 fail. `validate` finalise ✓.

---

## Test Artifacts

### Test Commands Executed

```bash
TMPDIR=/tmp node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
node scratchpad/qa4/mut7.mjs   # in a scratch worktree
node -e 'resolveCitation("b.js:1", evidenceIndex(["src/b.js","src/a.js"], new Set(["old/b.js"])))'
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high finding; one QA-verified medium reliability edge (CR4-1).
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR4-1 fixed and re-reviewed.

**Next Steps**: qa-fix cycle 4: CR4-1, then QA cycle 5.

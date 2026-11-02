# QA Report: Task 245 - Shared-checkout-safe guards and staging

**Task**: [Link to task document](./task.245.shared-checkout-safe-guards-and-staging.md)
**Gate File**: [task.245.gate.2.shared-checkout-safe-guards-and-staging.yml](./task.245.gate.2.shared-checkout-safe-guards-and-staging.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's finding (quoted porcelain paths) is fixed and held by test M7. The refute pass over the whole branch diff found two new medium defects, neither covered by a test. Tests are green at the reviewed head.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T245-QA-1 HALT filter fails open on quoted paths | FIXED | The loop reads `git status --porcelain -z`; test M7 (space and non-ASCII path) HALTs; with the old block restored M7 and test E go red (2 fail). |

Re-review scope: unscoped, whole branch diff (cycle 2 is always a full refute pass; 1207-line patch, bundled copies and task documents excluded).

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/qa-re-review-scope.md:246` — the loop reads a second `git status -z` through process substitution with no exit check; a failure leaves HALTS and WARNS empty and the guard passes (reviewer CR-1; reviewer anchored it at line 162, location unverified) → capture once and check. Gate id T245-QA-2.
- **[medium]** `skills/develop-batch/SKILL.md:643` — the merge lane never reads `stageReason`, unlike develop-next → gate the commit and `ticked: true` on staged / already-staged. Reviewer CR-2 (medium confidence); verified by reading both files. Gate id T245-QA-3.
- **[low/low]** `shared/resources/qa-re-review-scope.md:158` — CR-3: a sibling file directly under `docs/tasks` makes that directory a "changed directory", so a parallel registry edit would HALT. Not reproduced; recommendations.future.
- **[low/medium]** `shared/resources/registry-tick.js:228` — CR-4: read-modify-write on the index without re-reading, and a lock failure reports `not-a-repo` (cycle 1 CR-2 again). recommendations.future.

---

## Testing Scope

- [x] Automated Testing (`npm run ci:fast` at head 93b76dde: 6909 tests, 6895 pass, 0 fail)
- [x] Regression Testing
- [x] Code Review (refute pass)

### Review Methodology

Direct tools plus one read-only refute reviewer (the reviewer read code only and did not execute). CI_SUMMARY: not read in this cycle; `/finalise` gates CI on the final commit. Reviewer duration: about 39 s (`duration_ms` 38683).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: registry-tick --stage | PASS | CR-4 / cycle 1 CR-2 recorded as future |
| Phase 2: three committers | CONCERNS | T245-QA-3 (develop-batch) |
| Phase 3: re-review HALT | CONCERNS | T245-QA-2 |
| Phase 4: docs and bundling | PASS | bundle:check clean |

---

## Success Criteria Verification

SC-1 to SC-5, SC-10 to SC-15 as in report 1 (PASS). SC-5 is weakened by T245-QA-3 for develop-batch: it commits with `--stage` but ignores the staging outcome. SC-6 to SC-8 PASS with the new gap T245-QA-2 on a failing second `git status`. SC-9 unverified (no baseline).

---

## Breaking Changes Validation

Unchanged from report 1. **Overall:** PASS.

---

## Issues Found

### MEDIUM Severity Issues (2)

- T245-QA-2 — unchecked second `git status -z` in the HALT loop. Fix in the shared source, both skill copies and a test. P1.
- T245-QA-3 — develop-batch ignores `stageReason`. P1.

### LOW Severity Issues (2)

- Cycle-2 CR-3, CR-4 (see New Findings).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
T245-QA-2, T245-QA-3.
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No input-accepting boundary is delivered.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `shared/resources/qa-re-review-scope.md:162` ⚠️ unverified anchor (text-mismatch: the line is 246) — unchecked second `git status` → capture once and check
- [medium/medium] `skills/develop-batch/SKILL.md:648` — develop-batch ignores stageReason → gate on it
- [low/low] `shared/resources/qa-re-review-scope.md:158` — dirname rule and `docs/tasks` → not reproduced
- [low/medium] `shared/resources/registry-tick.js:228` — index read-modify-write → distinct reason, re-read

**Cleanups (0):** none.

Promotion: CR-1 (bug, high) entered the gate as T245-QA-2. CR-2 entered as T245-QA-3 on QA's own verification (reviewer confidence unchanged at medium).

Boundary: `boundary: false`, `probes_executed: 0`; the HALT loop is a classifier into two reporting classes, covered by M1 to M7.

mutation-proven: old HALT block restored → M7 and E red → covered (committed test), run in cycle 1's fix pass.

---

## Regression Testing

`npm run ci:fast`: 6909 tests, 6895 pass, 0 fail at head 93b76dde. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T245-QA-2 and T245-QA-3.

### Short-term Actions (Non-Blocking)
1. CR-3 and CR-4 follow-ups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two verified medium reliability defects.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T245-QA-2 and T245-QA-3 fixed

---

**QA Report**: co-located at `task.245.qa.2.shared-checkout-safe-guards-and-staging.md`
**Gate File**: co-located at `task.245.gate.2.shared-checkout-safe-guards-and-staging.yml`
**Next Steps**: /qa-fix for T245-QA-2 and T245-QA-3.

# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.5.probes-executed-from-engine.yml](./task.118.gate.5.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-5 re-review (the last in the budget), narrowed to the two files changed since gate 4. The cycle-4 fixes are **FIXED** and the put-back and fail-fast property are mutation-proven; one gap: nothing tests the *wiring* of the observed mtime from `withRecordLock` into `reclaimStaleLock` (`no-red-untested`). The scoped review found the put-back uses `rename`, which overwrites an existing file — verified on this host — so its EEXIST branch is dead and a third waiter's fresh lock can be clobbered by the stolen copy. It gates at LOW on QA's judgement: by the time the put-back runs the steal has already admitted both waiters, so the clobber adds no lost merge, but the code's claim about itself is false and the fix is `linkSync`. A 30 s orphan stall after a steal on a released holder is recorded at medium confidence. No HIGH at any of five cycles; the deliverable (engine-emitted count, computed evidence, population check, serialised record) has been correct since cycle 2 and every cycle since has been refining the lock's crash-recovery edges.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR5-1 closed

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR4-1 reclaim identity check | **FIXED** | stolen live lock → `false`, restored, no leftovers; genuine stale → `true`. Mutation: identity check disabled → red. **Wiring** (`withRecordLock` passing `observed`) — mutation `reclaimStaleLock(lock)` without the observation → no red: `no-red-untested`. |
| CR4-5 fail-fast property | **FIXED** | asserts `stdout === ""`. Mutation: preflight removed → red. |
| CR4-2 / CR4-3 / CR4-4 | FIXED | YAML 1.2 target stated; unused destructure gone; dead int branch removed (leading-zero mutation now reds). |

**Re-review scope**: since gate 4 (default) — `security-probe.mjs`, `review-security.test.js` (1,200-line scoped diff). `SAFETY_REPROBE=false`.

---

## New Findings This Cycle

- **[low]** `security-probe.mjs:683` — `renameSync(claimed, lock)` overwrites an existing file (verified: `rename` over a file overwrote; `link` threw EEXIST), so the EEXIST/ENOTEMPTY branch is unreachable and a third waiter's fresh lock is clobbered by the stolen copy. Reviewer rated medium; QA rates **low** — no additional lost merge, false self-description. → `linkSync` put-back with EEXIST fallback. **Gate CR5-1.**
- [low/medium] `security-probe.mjs:672` — after a steal on a holder that has since released, the put-back restores an orphan lock; every waiter then blocks up to 30 s. → holder pid in the lock; dead pid ⇒ stale. Advisory CR5-2.
- [QA-found, test gap] the observed-mtime wiring is untested — make the argument required.

---

## Review Methodology

Standard mode, re-review cycle 5, default narrowing. Direct tools for the five prior findings and three mutation proofs; one read-only Explore subagent for the scoped Step 3b review (2m27s, 2 findings). **Step 4b**: n/a. **Boundary**: false, 0, `reasoned`. **Platform variance**: n/a.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: the artefact | CONCERNS | put-back can clobber (CR5-1); orphan stall (CR5-2) |
| Phase 2 / 2b / 3 | PASS | unchanged since cycle 2 |

---

## Success Criteria Verification
Unchanged: SC1–4 PASS, SC5 N/A.

## Breaking Changes Validation
Unchanged — PASS.

---

## Issues Found
**HIGH**: 0. **MEDIUM**: 0. **LOW**: 1 gating (CR5-1), 1 advisory (CR5-2), 1 test gap.

---

## NFR Assessment
Performance PASS · Reliability CONCERNS (CR5-2, wiring gap) · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability PASS.

---

## Code Review

Scoped Step 3b, blocking under `code_review_blocking=true`. CR5-1 (reviewer medium/high → QA low/high), CR5-2 (low/medium, advisory).

**Mutation proofs (QA, cycle-4 fixes):**
```
mutation-proven: identity check disabled → reclaimStaleLock puts back a lock that is not the stale one → covered
mutation-proven: withRecordLock calls reclaimStaleLock(lock) without observed → (no red) → no-red-untested — the wiring has no test
mutation-proven: preflightRecord call removed → a corrupt --record fails before the probe runs → covered (property assertion, not timing)
```

---

## Loop guards (cycle 5)
- **Convergence check**: HIGH `0, 0, 0, 0, 0` — flat zero; not the stall guard's case.
- **Diminishing-returns exit**: `continue` (`product-defect-signal`).
- **Budget**: this is cycle 5 of 5. A fix cycle follows; the loop limit fires after it unless the gate is clean.

---

## Regression Testing
`npm run ci:fast` — 3398 tests, 3397 pass, 1 skipped, 0 fail. `review-security.test.js` 52/52.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one LOW high-confidence defect in the lock's crash-recovery put-back; the deliverable itself has been stable since cycle 2.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR5-1 closed.

---

**QA Report**: `task.118.qa.5.probes-executed-from-engine.md`
**Gate File**: `task.118.gate.5.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` cycle 5 of 5 — CR5-1 (`linkSync` put-back), CR5-2 (pid-in-lock) and the required-argument change together, since they are the same ten lines.

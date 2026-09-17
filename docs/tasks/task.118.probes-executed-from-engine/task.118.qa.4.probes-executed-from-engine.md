# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.4.probes-executed-from-engine.yml](./task.118.gate.4.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-4 re-review, narrowed to the two files changed since gate 3. Every cycle-3 finding is **FIXED** and mutation-proven (five `covered`, one `absorbed` — the float alternative already matches a digit run, which is CR4-4's dead-branch finding from the other side). The scoped review returned no high-confidence bug; it found one residual edge in the stale-lock reclaim — a waiter can rename away a live lock another waiter has just re-created — which QA confirmed by code reading and gates at low severity because the fix is a six-line identity check and the window needs a crashed holder, two waiters and a few syscalls. QA adds one finding of its own: the fail-fast test's `< 3000 ms` bound failed under load during the mutation run although the preflight had fired.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR4-1, CR4-5 closed

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR3-1 trailing `:` | **FIXED** | `foo:` / `x.ts:` quoted; interior colon bare. Mutation: rule removed → test red. |
| CR3-2 reclaim TOCTOU | **FIXED** | `reclaimStaleLock` by atomic rename; one-winner test. Mutation: rm-based → red. |
| CR3-3 timeout < stale | **FIXED** | `LOCK_TIMING` `{stale 30000, timeout 40000}`. Mutation: timeout below stale → red. |
| CR3-4 leading zeros | **FIXED** | `007` / `0123` quoted. Mutation: old int form restored → **absorbed** (the float alternative matches the run; see CR4-4). |
| CR3-5 read-only dir | **FIXED** | Mutation: `accessSync` removed → red. |
| CR3-6 verdict membership | **FIXED** | Mutation: membership removed → red. |
| CR3-7 / CR3-8 | FIXED | ENOENT-only continue; `spawn` destructured once. |

**Re-review scope**: since gate 3 (default) — `security-probe.mjs`, `review-security.test.js` (1,140-line scoped diff). `SAFETY_REPROBE=false`.

---

## New Findings This Cycle

- **[low]** `security-probe.mjs:668` — `reclaimStaleLock` renames whatever is at the lock path; between another waiter's stat and rename it can be a fresh lock. QA-verified by code reading. → identity-check after the rename, restore on mismatch. **Gate CR4-1.**
- **[low]** `review-security.test.js` (QA-found) — fail-fast test's wall-clock bound is load-sensitive (5118 ms under the mutation run). → assert no verdict was printed. **Gate CR4-5.**
- [low/medium] `security-probe.mjs:803` — js-yaml (YAML 1.1) types `1_000` and dates; the comment cites js-yaml. → state YAML 1.2 target or widen. Advisory CR4-2.
- cleanups — unused `recordRun` destructure + `void` (CR4-3); dead int alternative in `YAML_TYPED_SCALAR` (CR4-4).

---

## Review Methodology

Standard mode, re-review cycle 4, default narrowing. Direct tools for the eight prior findings and six mutation proofs; one read-only Explore subagent for the scoped Step 3b review (4m11s, 4 findings). **Step 4b**: n/a (no prose changed). **Boundary**: false, 0 probes, `reasoned`. **Platform variance**: n/a. No YAML parser is installed in this repo, so the trailing-colon / leading-zero claims rest on the reviewer's two-parser verification in cycle 3 and on the renderer's output shape here.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: the artefact | CONCERNS | one residual reclaim edge (CR4-1) |
| Phase 2 / 2b / 3 | PASS | unchanged |

---

## Success Criteria Verification
Unchanged: SC1–4 PASS, SC5 N/A.

## Breaking Changes Validation
Unchanged — PASS.

---

## Issues Found

**HIGH**: 0. **MEDIUM**: 0. **LOW**: 2 gating (CR4-1, CR4-5), 3 advisory/cleanup (CR4-2/3/4).

---

## NFR Assessment
Performance PASS · Reliability CONCERNS (CR4-1) · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability PASS.

---

## Code Review

Scoped Step 3b, blocking under `code_review_blocking=true`. Reviewer findings: CR4-1 (medium/medium → QA low/high on code reading), CR4-2 (low/medium), CR4-3, CR4-4 (cleanups). QA-found: CR4-5.

**Mutation proofs (QA, cycle-3 fixes):**
```
mutation-proven: YAML_TRAILING_COLON removed → quotes a value ending in ':' → covered
mutation-proven: int alternative reverted to (?:0|[1-9][0-9]*) → (no red) → absorbed — the float alternative matches the digit run (CR4-4)
mutation-proven: LOCK_TIMEOUT_MS = stale − 10 s → the lock's wait timeout exceeds its stale window → covered
mutation-proven: rename reclaim → rmSync → reclaimStaleLock has exactly one winner → covered
mutation-proven: VERDICTS membership removed → readRecord rejects a control whose verdict is not one of VERDICTS → covered
mutation-proven: accessSync removed → preflightRecord fails on a read-only directory → covered (the fail-fast timing test also went red — load, see CR4-5)
```

---

## Loop guards (cycle 4)
- **Convergence check**: HIGH `0, 0, 0, 0` — flat zero; not the stall guard's case.
- **Diminishing-returns exit**: `continue` (`product-defect-signal`).

---

## Regression Testing
`npm run ci:fast` — 3397 tests, 3396 pass, 1 skipped, 0 fail. `review-security.test.js` 51/51.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH or MEDIUM; two LOW gating entries, both contained and cheap; eight prior findings closed under mutation.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR4-1, CR4-5 closed.

---

**QA Report**: `task.118.qa.4.probes-executed-from-engine.md`
**Gate File**: `task.118.gate.4.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` cycle 4 of 5 — CR4-1, CR4-5; take CR4-2/3/4.

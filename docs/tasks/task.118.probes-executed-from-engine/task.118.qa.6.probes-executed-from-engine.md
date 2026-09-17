# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.6.probes-executed-from-engine.yml](./task.118.gate.6.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 6, run under the user's open-ended budget extension. The cycle-5 fixes are **FIXED** and mutation-proven (link-based put-back, required observation, dead-pid reclaim); the pid write itself has no test. The narrowed review found a fourth-order edge — a failed pid write leaks the descriptor and leaves an empty-body lock that reads as alive — and three low-confidence edges that all reduce to one fact: once a steal has happened, no put-back can restore mutual exclusion. This is the fifth consecutive cycle of real findings in the same ~130 lines, each one exposed by the previous fix. QA's recommendation, and the gate's single immediate action, is the move the third-strike rule exists for: **replace the mechanism** — per-control entry files folded on read, which have no shared write and therefore none of these edges — rather than patch the lock a fifth time.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR6-1 closed by mechanism replacement

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR5-1 rename overwrites | **FIXED** | `restoreStolenLock` with a newer lock present → `false`, newer lock kept, copy dropped. Mutation: link → rename → red. |
| CR5-2 orphan stall | **FIXED** | dead-pid lock reclaimed in 4 ms. Mutation: dead-pid rule removed → red after 30 s. |
| observation required | **FIXED** | throws without it. Mutation: made optional → red. |
| pid written into the lock | untested | Mutation: write removed → **no red** (`no-red-untested`). |

**Re-review scope**: since gate 5 — `security-probe.mjs`, `review-security.test.js` (1,318-line scoped diff). `SAFETY_REPROBE=false`.

---

## New Findings This Cycle

- **[medium]** `security-probe.mjs:754` — `writeFileSync(fd, pid)` inside the try whose catch handles only EEXIST: a write failure rethrows with the fd open and an empty-body lock in place, which `lockHolderAlive` reports alive → 30 s stall for every waiter. **Gate CR6-1.**
- [low/low] CR6-2 mtime-only identity can alias on coarse-timestamp filesystems now that reclaim is possible within ms of creation; CR6-3 a steal leaves two processes inside `fn()` and nothing detects it; CR6-4 a non-EEXIST link error orphans the `.stale.*` copy. Advisory — all removed by replacing the mechanism.
- [QA] pid write untested.

---

## Review Methodology

Standard mode, re-review cycle 6, default narrowing. Direct tools for the prior findings and four mutation proofs; one read-only Explore subagent for the scoped Step 3b review (2m29s, 4 findings). **Step 4b**: n/a. **Boundary**: false, 0, `reasoned`. **Platform variance**: CR6-2 names one (timestamp granularity); moot under the replacement.

---

## Implementation Verification
Phase 1 CONCERNS (lock edges); Phases 2/2b/3 PASS, unchanged since cycle 2.

## Success Criteria Verification
Unchanged: SC1–4 PASS, SC5 N/A.

## Breaking Changes Validation
Unchanged — PASS.

## Issues Found
HIGH 0 · MEDIUM 1 (CR6-1, gating) · LOW 3 advisory + 1 test gap.

## NFR Assessment
Performance PASS · Reliability CONCERNS · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability CONCERNS (the mechanism, not the deliverable).

---

## Code Review

Scoped Step 3b, blocking. CR6-1 (medium/high) gates. CR6-2/3/4 (low/low) advisory.

**Mutation proofs (QA, cycle-5 fixes):**
```
mutation-proven: linkSync → renameSync → the put-back never clobbers … → covered
mutation-proven: observation made optional → reclaimStaleLock refuses to run without … → covered
mutation-proven: dead-pid rule removed → dead holder reclaimed on the next retry → covered (red after 30 s)
mutation-proven: pid write removed → (no red) → no-red-untested
```

**Third-strike reading (QA).** The rule triggers on HIGH findings against one file across three gates; none of these was HIGH, so it never fired formally. Its reasoning applies exactly: `security-probe.mjs`'s lock was patched in cycles 2, 3, 4 and 5, each patch correct alone and each exposing the next edge. The reviewer's cycle-2 alternative — per-control files folded by `--emit-block` — has no shared-file write and so has no merge race, no stale reclaim, no put-back and no pid. Replace, do not patch again.

---

## Loop guards (cycle 6)
HIGH `0 ×6`; diminishing-returns `continue` (product-defect-signal). Budget: extended by the user, open-ended.

## Regression Testing
`npm run ci:fast` — 3402 tests, 3401 pass, 1 skipped, 0 fail. `review-security.test.js` 56/56.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM in the lock; the deliverable unchanged and correct since cycle 2; the mechanism has stopped converging and should be replaced.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR6-1 closed by replacing the lock with per-control entry files.

---

**QA Report**: `task.118.qa.6.probes-executed-from-engine.md`
**Gate File**: `task.118.gate.6.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` cycle 6 — replace the mechanism.

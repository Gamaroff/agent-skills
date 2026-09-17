# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.8.probes-executed-from-engine.yml](./task.118.gate.8.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 8. The cycle-7 fixes are **FIXED** — emit prints the block through a read-only snapshot directory (re-reproduced), an orphaned snapshot fails loudly (re-reproduced), the fold dedupes by key — and all four mutation proofs are `covered`. The scoped review returned **no high-confidence bug** for the first time: one low API gap (the library `recordRun` creates the entry directory before reading, so it lacks the guard the CLI preflight has), which QA verified by reading and promotes because the fix is two lines and shipping it as debt would be the wrong trade, plus four cleanups. No MEDIUM this cycle; no HIGH at any of eight.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR8-1 closed

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR7-1 emit snapshot write unguarded | **FIXED** | read-only dir → block printed, exit 0, warning on stderr. Mutation: unguarded → red. |
| CR7-2 orphaned snapshot silent | **FIXED** | snapshot-only → "no entry directory", exit 2. Mutations: silent again → red; preflight mkdir-before-read → red. |
| CR7-3 fold dedupe | **FIXED** | mutation: dedupe removed → red. |
| CR7-4..8 residue | FIXED | docstrings, JSDoc, concurrency assertions, banner, live count. |

**Re-review scope**: since gate 7 — `security-probe.mjs`, `review-security.test.js` (1,158-line scoped diff). `SAFETY_REPROBE=false`. The reviewer again saw QA's mutation harness in flight and used the HEAD blob as ground truth — correct, and the tree was restored (`git diff --quiet 381cd5b8`).

---

## New Findings This Cycle

- **[low]** `security-probe.mjs:710` — `recordRun` mkdirs before reading; a library caller can write over an orphaned snapshot. QA-verified. → read first, as `preflightRecord` does. **Gate CR8-1.**
- cleanups — CR8-2 `ran_at` compared two ways and never validated; CR8-3 `evidenceOf` JSDoc detached by a `//` block; CR8-4 re-run assertion order-dependent; CR8-5 no `error` handler on spawn in the concurrency test.

---

## Review Methodology

Standard mode, re-review cycle 8, default narrowing. Direct tools; one read-only Explore subagent for the scoped Step 3b review (3m44s, 5 findings). **Step 4b**: n/a. **Boundary**: false, 0, `reasoned`. **Platform variance**: n/a.

## Implementation Verification
Phase 1 CONCERNS (CR8-1, low); Phases 2/2b/3 PASS.

## Success Criteria Verification
Unchanged: SC1–4 PASS, SC5 N/A.

## Breaking Changes Validation
Unchanged — PASS.

## Issues Found
HIGH 0 · MEDIUM 0 · LOW 1 gating (CR8-1) · 4 cleanups.

## NFR Assessment
Performance PASS · Reliability CONCERNS (CR8-1) · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability PASS.

---

## Code Review

Scoped Step 3b, blocking. CR8-1 (low/medium → QA low/high). CR8-2..5 cleanups.

**Mutation proofs (QA, cycle-7 fixes):**
```
mutation-proven: emit snapshot write unguarded → still prints the block when the snapshot cannot be written → covered
mutation-proven: existsSync guard disabled → a snapshot with no entry directory is a loud failure → covered
mutation-proven: preflight mkdir before read → same test (fail-fast half) → covered
mutation-proven: dedupeByKey removed → the fold dedupes by {sink, entry} → covered
```

## Loop guards (cycle 8)
HIGH `0 ×8`; diminishing-returns `continue` (product-defect-signal, on a single low).

## Regression Testing
`npm run ci:fast` — 3398 tests, 3397 pass, 1 skipped, 0 fail. `review-security.test.js` 52/52.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one low API-path gap, promoted deliberately; nothing else above cleanup.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR8-1 closed.

---

**QA Report**: `task.118.qa.8.probes-executed-from-engine.md`
**Gate File**: `task.118.gate.8.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` cycle 8 — CR8-1..5, then cycle 9 → 5c.

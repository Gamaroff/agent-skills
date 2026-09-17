# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.3.probes-executed-from-engine.yml](./task.118.gate.3.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-3 re-review, narrowed to the two files changed since gate 2 (`security-probe.mjs`, its test). The cycle-2 fixes are **FIXED** — the three-process repro converges, a null control and a typed scalar are handled, a corrupt record fails fast — and each is mutation-proven, including the lock made a no-op (three tests red). The narrowed review found the YAML renderer still emits an unparseable block for a value ending in `:` (medium, verified against two parsers), misses the leading-zero integer form, and the lock's wait timeout is shorter than its stale window so the reclaim path cannot be reached in the window it exists for. Four further lock/preflight/schema edges at medium or low confidence are recorded for the same fix. No HIGH at any cycle; the diminishing-returns exit declined on the reliability CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after CR3-1, CR3-3, CR3-4 close

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR2-1 — unlocked merge loses controls (bug 2) | **FIXED** | 3-process repro → `n: 3`, no lock/temp left. Mutation: `withRecordLock` → `return fn()` reds the convergence test **and** both lock tests; stale-reclaim branch removed reds the reclaim test. Bug 2 → Closed. |
| CR2-2 — null / string-count control element | **FIXED** | `{controls:[null]}` → exit 2 "not a version-1 record". Mutation: removing `every(validControl)` reds the malformed-controls test. |
| CR2-3 — YAML-typed scalars bare | **FIXED** | `123` / `true` quoted. Mutation: dropping the typed-scalar branch reds its test. |
| CR2-4..7 (cleanups) | FIXED | corrupt `--record` → "cannot use --record", exit 2 in ms; stale comment reworded; prompt/engine severity parity test present; temp removed on rename failure. |

**Re-review scope**: since gate 2 (default) — `shared/resources/security-probe.mjs`, `skills/review-security/tests/review-security.test.js` (943-line scoped diff). `SAFETY_REPROBE=false` (gate 2 security axis `OK reasoned`).

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:762` — `yamlStr` leaves a value ending in `:` bare; `name: foo:` is a syntax error in js-yaml and yaml → quote it. **Gate CR3-1.**
- **[low]** `security-probe.mjs:641` — `LOCK_TIMEOUT_MS` 20 s < `LOCK_STALE_MS` 30 s → a waiter times out before reclaim is possible → timeout must exceed the stale window. **Gate CR3-3.**
- **[low]** `security-probe.mjs:759` — `007` / `0123` not matched by the typed-scalar regex; both parsers type them → YAML 1.2 core-schema int/float forms. **Gate CR3-4.**
- [medium / confidence medium] `security-probe.mjs:659` — stale reclaim is a stat→rm TOCTOU across two waiters → rename-based reclaim. Advisory (CR3-2).
- [low / medium] `security-probe.mjs:730` — `preflightRecord` does not detect an existing read-only directory (CR3-5); `security-probe.mjs:614` — `validControl` accepts any string verdict (CR3-6). Advisory.
- [low / low] `security-probe.mjs:656` — a persistent non-ENOENT `statSync` error on the lock loops without sleeping (CR3-7). Advisory.
- cleanup — `spawn` re-required inline in two tests (CR3-8).

---

## Testing Scope

### Prerequisites Verified
- [x] 4/4 phases; `npm run ci:fast` 3391 / 3390 / 1 skipped / 0; PR #418 OPEN at `02daba52`.

### Review Methodology

Standard mode, re-review cycle 3, narrowed by default scoping. Direct tools for verification of the three prior findings and four QA mutation proofs; **one read-only Explore subagent** for the scoped Step 3b review (returned in 5m29s with 8 findings, verified against two YAML parsers by the reviewer).

**Step 4b:** not applicable — the cycle-2 diff touched no `SKILL.md` or `shared/resources/*.md`.
**Boundary rule:** `boundary: false`, `probes_executed: 0`, `evidence: reasoned` — unchanged.
**Platform variance:** the lock and record tests write under `os.tmpdir()` to a writer, not a validator; n/a.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: the artefact | CONCERNS | merge now serialised; YAML rendering has one parse-breaking form (CR3-1) and one typed form (CR3-4); lock timeout < stale window (CR3-3) |
| Phase 2 / 2b: readers | PASS | unchanged |
| Phase 3: population check | PASS | unchanged (6 tests) |

**Overall Phase Completion**: 4/4; Phase 1 with gaps.

---

## Success Criteria Verification

Unchanged from cycle 2: SC1–4 PASS, SC5 N/A (finalise). CR3-1 is the one finding that touches a criterion: a block that does not parse is a block a gate cannot lift.

---

## Breaking Changes Validation
Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (1 gating + 1 advisory)
- CR3-1 (gate) — trailing-colon rendering; CR3-2 (advisory) — reclaim TOCTOU.
### LOW Severity Issues (2 gating + 4 advisory/cleanup)
- CR3-3, CR3-4 (gate); CR3-5, CR3-6, CR3-7, CR3-8.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 6

---

## NFR Assessment
- **Performance** — PASS. **Reliability** — CONCERNS (CR3-2/5/7 in the new lock/preflight code). **Security** — PASS (`reasoned`, 0 probes, `boundary: false`). **Maintainability** — PASS.

---

## Code Review

Scoped Step 3b, **blocking** under `code_review_blocking=true`. Gate entries: CR3-1 (medium/high), CR3-3 (low/high), CR3-4 (low/high). Advisory: CR3-2 (medium/medium), CR3-5, CR3-6 (low/medium), CR3-7 (low/low), CR3-8 (cleanup).

**Mutation proofs (QA, cycle-2 fixes):**
```
mutation-proven: withRecordLock → return fn() → concurrent runs converge + held-lock blocks + stale-lock reclaimed → covered
mutation-proven: stale-reclaim branch disabled → recordRun reclaims a stale lock → covered (red after the 20 s timeout)
mutation-proven: every(validControl) removed → readRecord rejects malformed control elements → covered
mutation-proven: YAML_TYPED_SCALAR check removed → emitBlock quotes a scalar YAML would type → covered
```

---

## Loop guards (cycle 3)

- **Convergence check**: HIGH sequence `0, 0, 0`. A flat-zero sequence is the diminishing-returns exit's case, not the stall guard's (engine comment: "non-zero and flat is the Convergence check's") — not tripped.
- **Diminishing-returns exit**: `classifyDiminishingReturns({cycle: 3, highCounts: [0,0,0], …})` → `continue` (`product-defect-signal` — reliability CONCERNS). `qa.testArtifactGlobs` absent ⇒ `[]`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3391 tests, 3390 pass, 1 skipped, 0 fail |
| `review-security.test.js` (45) | PASS |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; one MEDIUM rendering defect that would make the block unparseable for a gate, plus two LOW; the concurrency fix holds under mutation.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR3-1/3/4 closed.

---

**QA Report**: `task.118.qa.3.probes-executed-from-engine.md`
**Gate File**: `task.118.gate.3.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` cycle 3 of 5 — CR3-1/3/4, and CR3-2/5/6/7/8 in the same functions.

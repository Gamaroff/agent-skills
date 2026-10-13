# QA Report: Task 184 - qa-results carried-block and log residuals

**Task**: [task.184.qa-results-carried-block-and-log-residuals.md](./task.184.qa-results-carried-block-and-log-residuals.md)
**Gate File**: [task.184.gate.3.qa-results-carried-block-and-log-residuals.yml](./task.184.gate.3.qa-results-carried-block-and-log-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding (gate 2) | Status | Evidence |
| --- | --- | --- |
| CR-1 — write-then-refuse via the nested-block union | ✅ FIXED | gate 2 reproduction `replaced` ×3; R8 (343 shapes); M5 → R8 red; reviewer fuzz clean. Bug 1 closed. |
| CR-2 — write-then-refuse via `ambiguousAbove` | ✅ FIXED | R9; M6 → R9 red. Bug 2 closed. |
| CR-3 — cubic tail scan | ✅ FIXED | R10 (600 labels); M7 → R10 red (26 s) |
| CR-4 (cleanup) — fenced tail | not addressed (advisory) | `recommendations.future` |

---

## Executive Summary

Scoped re-review of cycle 2's fix (head `3dbc7016`). `sectionGuard()` on the replaced and the written section closed the write-then-refuse class: the reviewer fuzzed 450k documents (LF and CRLF, every placement, both carried names, nesting, fences, relocated and created writes) and found no write followed by a refusal, no non-idempotent rewrite and no lost line. One open finding: the 2 s performance criterion is at risk (PERF-1).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head e574d353f89f; 12 files) — default. Safety re-probe clause 1: false (gate 2 security PASS). One Step 3b reviewer (Explore), dispatched 08:32:40 UTC, returned after 1 534 631 ms (`duration_ms`). Uncommitted-change check before dispatch: clean outside the work item.

Step 4b: the two `SKILL.md` files changed only in prose and in a hint string inside the Step 12 writer block, which `tests/qa-results-step12-wiring.test.js` executes (green); the snippet engine refuses that block (`unrecognised-command: node`). zsh unavailable.

Timing note: an unrelated project's node processes held the load at 9–14 for this whole step, so wall-clock times here are inflated; PERF-1 compares CPU time back to back.

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-results.js` — PERF-1: the suites' 2 s criterion is at risk. Back to back at load 14: `af294361` real 6.92 s / user 10.57 s; `3dbc7016` real 11.32 s / user 17.83 s (+68% CPU). Scaled from `af294361`'s idle 1.08 s, about 1.8 s. R8 took 2.9 s under load. `sectionGuard` collects blocks twice per call and now runs twice per write → collect once; trim R8; re-measure at idle.
- **[low, cleanup]** `shared/resources/qa-results.js:801` — CR-1: duplicated `collectBlocks` work (4–6× base on label-dense input) — the mechanism behind PERF-1.
- **[low, cleanup]** `shared/resources/qa-results.js:42` — CR-2: the vocabulary says `unplaceable` can carry `unclosed-fence`, but `checked()` reports `read-back:1 unbounded` first.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | union + guard: fuzz clean |
| Phase 2 | PASS | R6, R9 |
| Phase 3 | PASS | R7, R8, R10 |
| Phase 4 | PASS | |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| CR-1 / CR-2 / CR3-2 / CR6-1 functional (R3, R5–R7) | PASS | suite 91/91 |
| Suites under 2 s | **at risk** | PERF-1 — not verifiable at the current load; ≈ 1.8 s estimated |
| No network access (one `require(`) | PASS | `grep -c 'require(' shared/resources/qa-results.js` → 1 |
| Corpus survey 0/0/0 | PASS | corpus suite green |
| Mutation proofs recorded | PASS | M1–M7 |
| ci:fast, bundle:check, validate | PASS | 5444/0 at `3dbc7016`; 0 problems; clean |

---

## Breaking Changes Validation

The two documented refusals hold; the written-section guard adds `unplaceable` refusals that the `SKILL.md` hints now name. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the 2 s performance criterion is at risk (PERF-1)**
- **Severity**: MEDIUM · **Category**: Performance
- **Observation**: CPU +68% over the cycle-0 head; R8 2.9 s under load
- **Recommendation**: collect blocks once per guard; trim R8; re-measure at idle. **Priority**: P2

No bug file: a performance criterion with its measurement in the gate; the fix and the re-measure land in the next cycle.

### LOW Severity Issues (2)

CR-1, CR-2 (cleanups).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — CONCERNS
PERF-1.

### Reliability — PASS
The write-then-refuse class is closed by construction; fuzz clean.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — unchanged from gates 1–2.

### Maintainability — PASS
CR-2 advisory.

---

## Code Review

**Correctness bugs (0).**

**Cleanups (2):**
- `shared/resources/qa-results.js:801` — CR-1: collect blocks once per guard.
- `shared/resources/qa-results.js:42` — CR-2: vocabulary note.

PERF-1 is QA's own finding from the timing step, not a promoted review finding.

Boundary: `internal`. `probes_executed: 0`.

mutation-proven: coverage check dropped → R8 → covered
mutation-proven: written-section guard dropped → R9 → covered
mutation-proven: scan terminator dropped → R10 → covered

---

## Regression Testing

Engine 91/91, corpus and wiring green (104 tests); `ci:fast` 5444/0 at `3dbc7016`.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
time -p command node --test …   # in a scratch worktree at af294361, then at HEAD, back to back
uptime
```

### Coverage Report
Not measured — no coverage tooling for `node --test` suites.

---

## Recommendations

### Immediate Actions (Blocking)
1. PERF-1.

### Short-term Actions (Non-Blocking)
1. CR-2; gate 2 CR-4; gate 1 CR-3.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium performance finding; performance NFR CONCERNS. HIGH 0 on all three gates.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: suites re-measured under 2 s

---

**QA Report**: co-located at `task.184.qa.3.qa-results-carried-block-and-log-residuals.md`
**Gate File**: co-located at `task.184.gate.3.qa-results-carried-block-and-log-residuals.yml`
**Next Steps**: `/qa-fix` cycle 3 — PERF-1.

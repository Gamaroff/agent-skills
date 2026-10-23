# QA Report: Task 224 - loop-supervisor: say when the probe script is not found

**Task**: [Link to task document](./task.224.loop-supervisor-probe-not-found.md)
**Gate File**: [task.224.gate.4.loop-supervisor-probe-not-found.yml](./task.224.gate.4.loop-supervisor-probe-not-found.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Re-Review Context

Previous gate: [task.224.gate.3.loop-supervisor-probe-not-found.yml](./task.224.gate.3.loop-supervisor-probe-not-found.yml) (PASS 100, one open low entry, head `c67d9dc0`).

| Finding | Status | Evidence |
| --- | --- | --- |
| QA-3: the `require.resolve` cache made a deleted script read as present | ✅ FIXED | `resolvesAsMain` now runs `fs.existsSync` on the resolved filename (`4f937982`). Two tests, "probeMissing sees a deletion between probes in one process: tools/select" and "…: tools/select.js", cover it. Replacing the re-check with `return true` fails both. |

---

## New Findings This Cycle

- **[low/medium, advisory]** `skills/loop-supervisor/references/adapters.js:385` (CR-1): after a stale cached hit, `resolvesAsMain` returns false without resolving again. A different candidate that appears later is still reported missing for the rest of the process. → On a stale hit, drop the cache entry and resolve once more.

---

## Executive Summary

QA-3 is fixed and the fix is mutation-proven. The scoped review returned one low-severity, medium-confidence bug. It was reproduced, but it is not promoted under the blocking rule (bug + high confidence only), so it goes to future recommendations. No entries are open.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#724)

### Testing Approach

- [x] Automated Testing (unit, spawned)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

I used direct tools plus one Explore diff reviewer. The reviewer took 59.5 s (`duration_ms` from its completion notice).

Re-review scope: files changed since gate 3 (head c67d9dc0e2d8; 5 files) — default

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: adapters.js | PASS | Verified | QA-3 fixed |
| Phase 2: wire-up, tests, docs | PASS | Verified | |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC4: script exists → `null`, probe runs as before | Agreement-table tests, the present-script dry-run test, and the "back" assertion in the new tests | PASS |
| SC2/SC3: missing script → not-found reason | Unit tests, now including a deletion between probes in one process | PASS |
| All other criteria | As in report 2. Loop-supervisor unit suite: 253 tests, 252 pass, 0 fail, 1 skipped | PASS |
| `npm run validate -- skills/loop-supervisor/` | exit 0 | PASS |

---

## Breaking Changes Validation

No change this cycle. The README, configuration reference and CHANGELOG wording ("missing" means Node cannot resolve it) still holds. **PASS.**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (0 gated, 1 advisory)

**CR-1: a stale hit hides a later replacement (advisory).** I reproduced it at `4f937982` in one process:

1. `tools/select.js` exists, and `probeMissing({probeScript: "tools/select"})` returns `null`.
2. I deleted `tools/select.js` and created `tools/select/index.js`.
3. `probeMissing` returns "probe script not found: tools/select …", but `node tools/select` exits 0.

The reviewer rated it medium confidence, and QA does not change confidence, so it stays advisory. The scenario (a script swapped for a different resolution shape mid-run) is narrower than QA-3's plain deletion. The loop still reports the error, and a restart clears it.

Provenance: base has no pre-check, so CR-1 is new to this change. It is not promoted because of its confidence rating, not because it is pre-existing.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 gated (1 advisory)

---

## NFR Assessment

### Performance — PASS
One `require.resolve` and one stat per probe.

### Reliability — PASS
A deletion mid-run is now reported. CR-1 is advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged. No new predicate was added. The re-check only moves `resolvesAsMain` toward `false`, which gives the same `status: error` a missing script always gave. Its input is still operator-authored config.

### Maintainability — PASS
The change is small and commented. CR-4 (gate 3) still stands.

---

## Code Review

Scoped to the cycle-3 fix. `code_review_blocking` is on for this pipeline run, and no finding qualified for promotion.

**Correctness bugs (1):**
- [low/medium] `skills/loop-supervisor/references/adapters.js:385` — A stale cached hit returns false without resolving again, so a replacement candidate that appears later is still reported missing → On a stale hit, drop the cache entry and resolve once more, with a delete-and-replace test.

**Cleanups (0):**

Anchor check: `finding-anchors.js` reason `ok`; CR-1 `anchor_check: ok`.

mutation-proven: `return fs.existsSync(resolved)` → `return true` → "probeMissing sees a deletion between probes in one process: tools/select" and "…: tools/select.js" went red → covered

The proof ran in a scratch worktree. Applying the mutation removed 1 occurrence (before 1, after 0). The baseline was 63/63 after restoring.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Loop-supervisor unit suites (`evals/loop-supervisor/unit/*.test.mjs`) | PASS (252/253, 1 skipped) |
| Fast gate (`npm run ci:fast`, run by qa-fix at `4f937982`) | PASS (6179 pass, 0 fail) |
| Prettier on changed sources | PASS |

---

## Test Artifacts

### Files Reviewed
- `skills/loop-supervisor/references/adapters.js`
- `evals/loop-supervisor/unit/adapters.test.mjs`

### Test Commands Executed
```bash
command node --test --test-reporter=tap evals/loop-supervisor/unit/*.test.mjs
npm run validate -- skills/loop-supervisor/
./node_modules/.bin/prettier --check skills/loop-supervisor/references/adapters.js evals/loop-supervisor/unit/adapters.test.mjs
```

### Coverage Report
Not measured (the repository does not collect coverage for these suites).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: re-resolve after a stale hit.
2. CR-2 to CR-5 from gate 3.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: QA-3 is fixed and mutation-proven. There are no open gate entries. The one new finding is advisory.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.224.qa.4.loop-supervisor-probe-not-found.md`
**Gate File**: co-located at `task.224.gate.4.loop-supervisor-probe-not-found.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.

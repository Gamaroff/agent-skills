# QA Report: Task 224 - loop-supervisor: say when the probe script is not found

**Task**: [Link to task document](./task.224.loop-supervisor-probe-not-found.md)
**Gate File**: [task.224.gate.3.loop-supervisor-probe-not-found.yml](./task.224.gate.3.loop-supervisor-probe-not-found.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Re-Review Context

Previous gate: [task.224.gate.2.loop-supervisor-probe-not-found.yml](./task.224.gate.2.loop-supervisor-probe-not-found.yml) (CONCERNS 90, head `a7e0c197`).

| Finding | Status | Evidence |
| --- | --- | --- |
| QA-2: `probeMissing` disagreed with Node main-module resolution | ✅ FIXED | `resolvesAsMain` (`c67d9dc0`). Five "probeMissing agrees with node on: …" tests compare it with a real spawn. Reverting to `existsSync` reds two of them. |

---

## New Findings This Cycle

- **[low]** `skills/loop-supervisor/references/adapters.js:379`: `require.resolve` caches a hit for the process. A script deleted after its first probe still reads as present (QA-3, promoted: bug + high confidence). → Re-check the resolved file on disk.
- **[low, advisory]** `adapters.js:415`: when a default-search hit later vanishes, the message says "configured by …" (CR-2).
- **[low, advisory]** `adapters.js:381`: the bare `catch` maps every resolution error to "not found" (CR-3).
- **[cleanup]** `adapters.js:251`: `firstExisting` has no production caller (CR-4).
- **[cleanup]** `adapters.test.mjs:356` ⚠️ unverified anchor (text-mismatch): the agreement table lacks package.json `main`, trailing-slash, `.mjs`-beside and symlink rows (CR-5).

---

## Executive Summary

QA-2 is fixed and the new tests are mutation-proven. The scoped review found that the fix's `require.resolve` caches a hit for the process. That gives a stale "present" in the long-running loop, which cycle 1's `existsSync` did not have. The bug is low severity and high confidence, so it is promoted. The gate reads PASS by the deterministic rules, but one entry is open.

**Overall Assessment**: PASS (one open low entry)
**Deployment Recommendation**: CONDITIONAL (QA-3)

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

Direct tools, plus one Explore diff reviewer. Reviewer duration 118.4 s (from its completion notice).

Re-review scope: files changed since gate 2 (head a7e0c19750f1; 8 files) — default

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: adapters.js | PASS | Verified | QA-3 open (low) |
| Phase 2: wire-up, tests, docs | PASS | Verified | |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC4 script exists → `null`, probe runs as before | Agreement table tests plus the present-script dry-run test | PASS |
| SC2/SC3 missing script → not-found reason | Unit tests pass. In a long-running loop, a script deleted after a first hit is not caught (QA-3) | PASS (QA-3 open) |
| All other criteria | as in report 2; 251 tests, 250 pass, 0 fail, 1 skipped | PASS |
| `npm run validate -- skills/loop-supervisor/` | exit 0 | PASS |

---

## Breaking Changes Validation

The documented reason-text change is unchanged. The cycle-2 docs (README, configuration reference, CHANGELOG) now say "missing" means Node cannot resolve it. **PASS.**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

**QA-3: `require.resolve` cache makes a deleted script read as present.** This was reproduced at `c67d9dc0`, in one process:

1. Resolve the adapter with `tools/select` (and, separately, `tools/select.js`); `probeMissing` returns `null`.
2. Delete `tools/select.js`; `probeMissing` returns `null` again.

`run-loop.mjs` calls `resolveAdapter` once (line 1111) and `runProbe` on every iteration (line 1367), so the loop sees the stale result.

Provenance: base has no pre-check, so its output is the same old message. The task's own scope is this message, so the finding is in scope, not pre-existing.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
One `require.resolve` per probe.

### Reliability — PASS
QA-3 is carried. CR-3 is advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The new predicate is `resolvesAsMain`. Its `false` yields the same `status: error` a missing script always gave, and its input is operator-authored config that was already executed verbatim. No trust boundary moves.

### Maintainability — PASS
CR-4 is advisory.

---

## Code Review

`code_review_blocking` resolved **true**. CR-1 is `bug` + `high` confidence, so it is promoted as **QA-3** (severity low, as returned).

**Correctness bugs (3):**
- [low/high] `skills/loop-supervisor/references/adapters.js:379`: `require.resolve` process cache keeps a stale hit → QA-3.
- [low/medium] `skills/loop-supervisor/references/adapters.js:415`: a default-search hit that later vanishes is reported as "configured by …". → Record the path's source.
- [low/medium] `skills/loop-supervisor/references/adapters.js:381`: the bare `catch` maps a broken package.json to "not found". → Only `MODULE_NOT_FOUND` is missing.

**Cleanups (2):**
- `skills/loop-supervisor/references/adapters.js:251`: `firstExisting` has no production caller.
- `evals/loop-supervisor/unit/adapters.test.mjs:356` ⚠️ unverified anchor (text-mismatch): the agreement table has no package.json `main`, trailing-slash, `.mjs`-beside or symlink rows.

Anchor check: `finding-anchors.js` → `malformed-anchors` (4 ok, CR-5 text-mismatch, because prettier reflowed the table).

**Mutation proofs:**
- mutation-proven: `probeMissing` default reverted to `fs.existsSync` → "probeMissing agrees with node on: extensionless, .js beside it" and "… directory without an index" → covered. This was run in a detached scratch worktree during qa-fix cycle 2, against content identical to `c67d9dc0`.

Platform variance: none.

---

## Regression Testing

| Area | Result |
| --- | --- |
| loop-supervisor unit suite (251) | PASS: 250 pass, 0 fail, 1 skipped |
| `npm run validate -- skills/loop-supervisor/` | PASS |

---

## Test Artifacts

### Files Reviewed
`adapters.js`, `adapters.test.mjs`, `README.md`, `configuration.md`, `CHANGELOG.md`, and the task artefacts changed since `a7e0c197`.

### Test Commands Executed
```bash
command node --test --test-reporter=tap evals/loop-supervisor/unit/*.test.mjs
npm run validate -- skills/loop-supervisor/
# QA-3 reproduction: resolve, delete tools/select.js, probeMissing again in the same process
```

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-3: re-check the resolved file on disk; test resolve → delete → probe in one process.

### Short-term Actions (Non-Blocking)
1. CR-2 to CR-5 as above.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No medium or high findings. One promoted low entry is open.
**Quality Score**: 100/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-3 fixed

---

**QA Report**: co-located at `task.224.qa.3.loop-supervisor-probe-not-found.md`
**Gate File**: co-located at `task.224.gate.3.loop-supervisor-probe-not-found.yml`
**Next Steps**: `/qa-fix` for QA-3, then re-review (cycle 4).

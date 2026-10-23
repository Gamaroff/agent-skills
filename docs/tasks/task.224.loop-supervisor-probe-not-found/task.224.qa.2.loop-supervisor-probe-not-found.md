# QA Report: Task 224 - loop-supervisor: say when the probe script is not found

**Task**: [Link to task document](./task.224.loop-supervisor-probe-not-found.md)
**Gate File**: [task.224.gate.2.loop-supervisor-probe-not-found.yml](./task.224.gate.2.loop-supervisor-probe-not-found.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [task.224.gate.1.loop-supervisor-probe-not-found.yml](./task.224.gate.1.loop-supervisor-probe-not-found.yml) (CONCERNS 90, head `7f2ed4ad`).

| Finding | Status | Evidence |
| --- | --- | --- |
| QA-1: no spawned test with the probe script present | ✅ FIXED | New t224 "probe script installed" dry-run test (`a7e0c197`). Re-proven this cycle: `runProbe` returning `probeMissing` unconditionally reds exactly that test. |

---

## New Findings This Cycle

- **[medium]** `skills/loop-supervisor/references/adapters.js:380`: `probeMissing` uses `fs.existsSync`, but the spawn resolves the script the way Node resolves a main module. A configured extensionless `probeScript` that Node runs is now refused (QA-2). → Use `require.resolve` semantics.
- **[low, cleanup]** `evals/loop-supervisor/unit/run-loop.test.mjs:745`: `dryRun` has no `try/finally`, so a throwing `setup` leaks its temp dir (CR-2, advisory).

---

## Executive Summary

Cycle 2 was a full-diff refute pass. QA-1 is fixed and its test is mutation-proven. The refute pass found one real regression: an extensionless `probeScript` override that worked before this change is now refused.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-2)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (but see QA-2)
- [x] Code on feature branch with open PR (#724)

### Testing Approach

- [x] Automated Testing (unit, spawned dry-run)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (refute pass)

### Review Methodology

Direct tools, plus one Explore diff reviewer with the REFUTE PASS directive appended. Reviewer duration 100.1 s (from its completion notice).

Re-review scope: unscoped — cycle 2 (one prior gate) reviews the whole `origin/develop...HEAD` diff to refute, 12 files.

Step 4b: not applicable — no runnable prose in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: adapters.js (`DEFAULT_PROBE_SCRIPT`, `findExisting`, `probeSearched`, `probeMissing`) | CONCERNS | Partial | QA-2: existence check disagrees with the spawn's resolution |
| Phase 2: `runProbe` wire-up, tests, docs | PASS | Verified | QA-1 closed |

**Overall Phase Completion**: 2/2 implemented; 1 with a regression.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC1–SC3, SC5, SC6 | As in QA report 1; all tests still pass | PASS |
| SC4 script exists → `null`, probe runs as before | Present-script dry-run test now held (`covered`). But an extensionless configured script that Node resolves is now refused (reproduced) | CONCERNS (QA-2) |
| Perf: ≤ 3 exists calls; +1 per probe | unchanged tests | PASS |
| CQ: suite passes | 246 tests: 245 pass, 0 fail, 1 skipped | PASS |
| CQ: `npm run validate -- skills/loop-supervisor/` | exit 0 | PASS |

---

## Breaking Changes Validation

### Breaking Change: missing probe script reason text
Documented: Yes. Migration Path Provided: Yes. Consumer Code Updated: N/A.

### Undocumented: extensionless `probeScript` override now refused
Documented: No. This is a regression to fix (QA-2), not a change to document.

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: QA-2 — `probeMissing` disagrees with Node's main-module resolution**
- **Severity**: MEDIUM (the reviewer returned medium/medium; QA reproduced it by execution)
- **Category**: Functional
- **Observation**: Reproduction at `a7e0c197`, in a temp project with `tools/select.js` and config `loopSupervisor.adapters.develop-next.probeScript: tools/select`:
  - `node tools/select` exits 0 and prints its JSON.
  - `probeMissing` returns `probe script not found: tools/select (configured by loopSupervisor.adapters.develop-next.probeScript).`

  On base (`origin/develop`), `runProbe` has no pre-check and spawns the script directly, so the same config ran. The finding is new to this change.
- **Plausibility**: no configured `probeScript` exists in this repository's tracked tree (`git grep probeScript`, excluding docs and tests), so the corpus count is 0. Any consumer can write the shape, because the configuration reference documents `probeScript` as a path. Severity is kept at medium.
- **Impact**: a consumer config that worked stops the loop at the first probe.
- **Recommendation**: treat the script as missing only when `require.resolve(path.resolve(cwd, script))` fails. Keep the injectable seam, and add tests for an extensionless override that resolves and one that does not.
- **Priority**: P2

No bug file: the regression is in this change set and is fixed in the QA loop.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
The missing-script path is reliable. QA-2 is carried as a functional finding.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged from gate 1. The candidates are still `probeMissing` and `findExisting`. QA-2 is a false refusal of operator config, not an input crossing a trust boundary.

### Maintainability — PASS
CR-2 is advisory.

---

## Code Review

Advisory except where promoted. `code_review_blocking` resolved **true**. No finding was `bug` + `high`, so none was promoted by the mapping. QA-2 enters `top_issues[]` on QA's own execution evidence against SC4.

**Correctness bugs (1):**
- [medium/medium] `skills/loop-supervisor/references/adapters.js:380`: `existsSync` disagrees with Node main-module resolution in both directions (extensionless file refused; directory accepted). → QA-2.

**Cleanups (1):**
- `evals/loop-supervisor/unit/run-loop.test.mjs:745`: no `try/finally` around the temp dir cleanup in `dryRun`. → Wrap the body in `try/finally`.

Anchor check: `finding-anchors.js` → `ok` (2/2).

Refute-pass transitions:
- Error path: the probe now stops before the spawn, and the next iteration re-probes, so the run can recover.
- Teardown, in-flight and reconnect: not applicable, because there is no lifecycle state.
- Identity: the existence predicate is exactly where the pair that must be the same (an extensionless name and its `.js` file) is wrongly split. That is QA-2.

**Mutation proofs** (detached scratch worktree, removed after):
- mutation-proven: `runProbe` returns `probeMissing` unconditionally → "t224: dry-run --adapter develop-next with the probe script installed runs it" → covered

Platform variance: none (temp dirs are used only as `cwd`).

---

## Regression Testing

| Area | Result |
| --- | --- |
| loop-supervisor unit suite (246) | PASS: 245 pass, 0 fail, 1 skipped |
| `npm run validate -- skills/loop-supervisor/` | PASS |

---

## Test Artifacts

### Files Reviewed
Whole branch diff: `adapters.js`, `run-loop.mjs`, both test files, README, configuration reference, CHANGELOG, task artefacts.

### Test Commands Executed
```bash
command node --test --test-reporter=tap evals/loop-supervisor/unit/*.test.mjs
npm run validate -- skills/loop-supervisor/
# QA-2 reproduction: temp project with tools/select.js, override probeScript=tools/select
command node tools/select                       # exit 0
# probeMissing(resolveAdapter("develop-next", config, {cwd}), cwd)   # -> "probe script not found"
```

### Coverage Report
Not measured (no coverage tooling for these suites).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-2: align `probeMissing` with Node's main-module resolution (P2).

### Short-term Actions (Non-Blocking)
1. CR-2: `try/finally` in `dryRun`.
2. Gate 1 CR-1 and CR-3 remain advisory.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: QA-1 is closed, but the existence pre-check introduces a regression for one valid configuration shape.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-2 fixed

---

**QA Report**: co-located at `task.224.qa.2.loop-supervisor-probe-not-found.md`
**Gate File**: co-located at `task.224.gate.2.loop-supervisor-probe-not-found.yml`
**Next Steps**: `/qa-fix` for QA-2, then re-review (cycle 3).

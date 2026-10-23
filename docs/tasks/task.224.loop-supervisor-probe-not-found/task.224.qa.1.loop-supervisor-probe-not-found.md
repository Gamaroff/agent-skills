# QA Report: Task 224 - loop-supervisor: say when the probe script is not found

**Task**: [Link to task document](./task.224.loop-supervisor-probe-not-found.md)
**Gate File**: [task.224.gate.1.loop-supervisor-probe-not-found.yml](./task.224.gate.1.loop-supervisor-probe-not-found.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Both phases are implemented as planned and every test passes, including with the `.agents/skills` symlink absent. One Success Criterion half has no committed test: nothing spawns the probe with the script present.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (one output text change; `status` unchanged)
- [x] Code on feature branch with open PR (#724)

### Testing Approach

- [x] Automated Testing (unit, spawned dry-run)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools (small task: 2 phases, one module, low risk), plus one Explore diff reviewer (Step 3b). Reviewer dispatched 20:11:11Z; duration 69.7 s (from its completion notice). Traceability matrix from the Step 5 mapper: `.summaries/qa-traceability-matrix.md`.

Step 4b: not applicable — no runnable prose in the change set (the diff touches `skills/loop-supervisor/README.md`, not a `SKILL.md` or `shared/resources/*.md`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: adapters.js (`DEFAULT_PROBE_SCRIPT`, `findExisting`, `probeSearched`, `probeMissing`) | PASS | Verified | Matches the plan |
| Phase 2: `runProbe` wire-up, tests, docs | CONCERNS | Partial | QA-1: present-script path not spawned by any test |

**Overall Phase Completion**: 2/2 implemented; 1 with a coverage gap.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC1 empty project → default + `probeSearched` | `adapters.test.mjs` "none present" tests | PASS |
| SC2 searched-miss reason | `adapters.test.mjs` probeMissing searched-miss tests | PASS |
| SC3 override miss names the config key | `adapters.test.mjs` override test | PASS |
| SC4 script exists → `null`, probe runs as before | `null` half: unit test. "Runs as before": `run-loop.mjs:1046-1048` (code read) and a hand dry-run in this repo only | CONCERNS (QA-1) |
| SC5 spawned dry-run reports not found | `run-loop.test.mjs` t224 test | PASS |
| SC6 `interpretProbe` message unchanged | `classify.test.mjs:330` passes | PASS |
| Perf: ≤ 3 exists calls; +1 per probe | call-count test + counting-`exists` test | PASS |
| CQ: table entries equal the last candidate | `adapters.test.mjs` CR-2 tests | PASS |
| CQ: suite passes with the symlink absent, and in CI | 244 pass / 0 fail in a detached worktree (no `.agents/skills`); CI `test` pending | PASS (local) |
| CQ: `npm run validate -- skills/loop-supervisor/` | exit 0 | PASS |
| Migration: README + configuration row | `README.md:174-176`, `configuration.md:301` | PASS |
| Migration: CHANGELOG `[Unreleased]` cites task 224 | `CHANGELOG.md:96`, under `[Unreleased]` → `### Fixed` | PASS |

---

## Breaking Changes Validation

### Breaking Change: missing probe script reason text
Documented: Yes
Migration Path Provided: Yes (CHANGELOG, README)
Migration Tested: Yes (t224 test)
Consumer Code Updated: N/A (`status` stays `error`)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: QA-1 — no spawned test with the probe script present**
- **Severity**: MEDIUM
- **Category**: Quality (test coverage)
- **Observation**: Every new test covers the missing-script path. `probeMissing` returning `null` is unit-tested, but nothing runs `runProbe` end to end when the script exists. A `runProbe` that returned `probeMissing`'s value unconditionally would return `null` for every installed project, and no test would go red.
- **Impact**: The most damaging regression this change could cause — every develop-next run breaking — is unguarded.
- **Recommendation**: Add a dry-run test with a stub `.agents/skills/develop-next/scripts/select-next.mjs` present, asserting a non-error probe result; mutation-prove it.
- **Priority**: P2

No bug file: the finding is a coverage gap in this change set's own tests, and it is fixed in the QA loop.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
At most three `exists` calls in resolution, and one more per probe (zero for `generic`). Both are held by tests.

### Reliability — PASS
A missing script now stops before the spawn with an accurate message. CR-1 (advisory): `existsSync` is false on EACCES too.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates: `probeMissing` (returns `null` or `{status:"error"}`) and `findExisting` (returns a path or `null`). Neither changes the set of actions taken. A missing script already failed with `status: error` before this change, and still does. An existing one runs exactly as before. `probeScript` is operator-authored config that was already executed verbatim, so no input moves from refused to accepted or back.

### Maintainability — PASS
One default-path constant replaces two literals (task.214 CR-2). Docs updated.

---

## Code Review

Advisory except where promoted. `code_review_blocking` resolved **true** (pipeline override, no doc flag). No finding was `bug` + `high`, so none was promoted.

**Correctness bugs (1):**
- [low/low] `skills/loop-supervisor/references/adapters.js:380`: `existsSync` is false both when the script is absent and when it cannot be stat'd, so an unreadable install reads as "not found". → `statSync` in try/catch; report not-found only on ENOENT/ENOTDIR.

**Cleanups (2):**
- `evals/loop-supervisor/unit/run-loop.test.mjs:975`: `ran: []` holds on every dry-run path, so this assertion is vacuous. → Assert instead that the old "probe produced no output" text is absent.
- `skills/loop-supervisor/references/adapters.js:251`: `firstExisting` has no production caller left. → Mark it as kept for export compatibility.

Anchor check: `finding-anchors.js` → `ok` (3/3).

**Boundary rule:** `boundary: false`. See Security above.

**Mutation proofs** (detached scratch worktree, reverted after each):
- mutation-proven: `probeMissing` always returns `null` → 4 adapters tests + t224 dry-run test → covered
- mutation-proven: `runProbe` skips the `probeMissing` return → t224 dry-run test → covered
- not run this cycle: the override-reset mutation (proven during development, 2 tests red; a workspace hook throttled further edits) → not-run

Platform variance: no environment-derived value reaches a validating consumer (the tests use `mkdtemp` directories only as `cwd`).

---

## Regression Testing

| Area | Result |
| --- | --- |
| loop-supervisor unit suite (245) | PASS: 244 pass, 0 fail, 1 skipped |
| Same suite, `.agents/skills` absent | PASS: 244 pass, 0 fail |
| `classify.test.mjs:330` empty-stdout message | PASS |
| `npm run ci:fast` (development, same head) | PASS: 6171 pass, 0 fail |

---

## Test Artifacts

### Files Reviewed
`skills/loop-supervisor/references/adapters.js`, `skills/loop-supervisor/scripts/run-loop.mjs`, `evals/loop-supervisor/unit/adapters.test.mjs`, `evals/loop-supervisor/unit/run-loop.test.mjs`, `skills/loop-supervisor/README.md`, `docs/reference/configuration.md`, `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test evals/loop-supervisor/unit/*.test.mjs
npm run validate -- skills/loop-supervisor/
# in a detached worktree with no .agents/skills:
command node --test evals/loop-supervisor/unit/*.test.mjs
```

### Coverage Report
Not measured (the repository has no coverage tooling for these suites).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-1: spawned dry-run test with the probe script present (P2).

### Short-term Actions (Non-Blocking)
1. CR-1, CR-2, CR-3 as above.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The behaviour is correct, but its most important regression path has no committed test.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-1 fixed

---

**QA Report**: co-located at `task.224.qa.1.loop-supervisor-probe-not-found.md`
**Gate File**: co-located at `task.224.gate.1.loop-supervisor-probe-not-found.yml`
**Next Steps**: `/qa-fix` for QA-1, then re-review.

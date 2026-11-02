# QA Report: Task 245 - Shared-checkout-safe guards and staging

**Task**: [Link to task document](./task.245.shared-checkout-safe-guards-and-staging.md)
**Gate File**: [task.245.gate.1.shared-checkout-safe-guards-and-staging.yml](./task.245.gate.1.shared-checkout-safe-guards-and-staging.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS

---

## Executive Summary

The change adds `registry-tick.js --stage` and narrows the QA re-review HALT. Tests, formatting, skill validation and bundling are all green. One verified defect: the new HALT filter fails open for paths that `git status` quotes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (if applicable)
- [x] Code on feature branch with open PR (#796)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast`)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only diff reviewer (first review, whole branch diff, bundled copies excluded). Step 4b: the change set edits fenced bash blocks in three SKILL.md files; the execution engine was not run separately, because `finalise-6a-registry-staging.test.mjs` and `qa-scope-from-head.test.mjs` execute the real blocks under bash (zsh is not installed on this host).

Reviewer timing: not measured (about 46 s per the completion notice, `duration_ms` 45736).

CI_SUMMARY: not read in this cycle (no `qa-ci-read.sh` run; the PR was opened minutes earlier). `/finalise` gates CI on the final commit.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `registry-tick.js --stage` | PASS | Verified | 9 new tests; 95 pass |
| Phase 2: three registry committers | PASS | Verified | 6a executed test with control |
| Phase 3: re-review HALT | CONCERNS | Partial | M1-M6 pass; quoted-path gap (T245-QA-1) |
| Phase 4: docs and bundling | PASS | Verified | bundle:check clean |

**Overall Phase Completion**: 4/4 phases delivered, one with a concern.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1..SC-3 `--stage` row by id, reasons exit 0 | PASS | `registry-tick.test.mjs` |
| SC-4 6a has no whole-file add | PASS | `finalise-6a-registry-staging.test.mjs` |
| SC-5 develop-next / develop-batch use `--stage` | PASS | skill-shape tests |
| SC-6, SC-7, SC-8 HALT split | PASS for ASCII paths | `qa-scope-from-head.test.mjs` M1-M6; fails open for quoted paths (T245-QA-1) |
| SC-9 wall time within 5% | unverified | 84 s full gate; no develop baseline measured |
| SC-10 no network call | PASS | read: `execFileSync("git", …)` only (`registry-tick.js:1187`) |
| SC-11 mutation proofs | PASS (dev-only) | recorded in the implementation report; not re-run this cycle |
| SC-12 ci passes, bundle clean | PASS | ci:fast 6894 pass, 0 fail; bundle:check rc 0 |
| SC-13 validate | PASS | `npm run validate` on the five changed skills, rc 0 |
| SC-14 CHANGELOG cites task 245 | PASS | read |
| SC-15 doc sweep | PASS | listed in the implementation report |

---

## Breaking Changes Validation

### Breaking Change: tracked edits outside the review scope warn instead of HALT

Documented: Yes
Migration Path Provided: N/A (behaviour change, `--stage` is opt-in)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T245-QA-1 — HALT filter fails open on quoted paths**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: `git status --porcelain` prints `M "d e/f g.txt"` and `M "\303\251.txt"` for paths with a space or non-ASCII character (reproduced in a scratch repo). The quoted value never matches `git diff --name-only` output, so a dirty changed file warns instead of halting.
- **Impact**: the review reads committed history and misses an uncommitted fix. The old rule halted on all such edits, so this is a regression.
- **Recommendation**: use `--porcelain -z`, fix the shared source, re-bundle, add a spaced and a non-ASCII test.
- **Priority**: P1

### LOW Severity Issues (1)

- CR-2 (reviewer confidence low): `stageReason: "not-a-repo"` is returned for `hash-object` / `update-index` failure (an index lock held by a parallel session) as well as for a non-repo. Recorded as a future item.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Full fast gate about 84 s. SC-9 baseline not measured.

### Reliability — CONCERNS
T245-QA-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No input-accepting boundary is delivered; git is called with argv arrays.

### Maintainability — PASS
One block definition, held equal across three copies by test E.

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `shared/resources/qa-re-review-scope.md:233` — CR-1: quoted porcelain paths never match the changed-file list → use `-z`. Reproduced; entered the gate as T245-QA-1 on QA's own verification (the reviewer's confidence is unchanged, so the code-review blocking mapping did not apply).
- [low/low] `shared/resources/registry-tick.js:1230` — CR-2: one `stageReason` for several distinct failures → add a distinct reason, raise `maxBuffer`.

**Cleanups (0):** none.

Platform variance: no environment-derived value reaches a validating consumer in the change set. Not run under another `TMPDIR`.

Boundary: `boundary: false` — the diff adds no accept/reject predicate; the HALT filter classifies paths into two reporting classes and is exercised by M1-M6. `probes_executed: 0`.

mutation-proven: not re-run this cycle; the developer's proofs (implementation report, Decisions Log) are dev-only.

---

## Regression Testing

Full `npm run ci:fast`: 6908 tests, 6894 pass, 0 fail, 14 skipped. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run validate -- skills/{finalise,develop-next,develop-batch,qa-task,qa-story}/
npm run bundle:check
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T245-QA-1.

### Short-term Actions (Non-Blocking)
1. CR-2 distinct `stageReason`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one verified medium reliability regression.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T245-QA-1 fixed

---

**QA Report**: co-located at `task.245.qa.1.shared-checkout-safe-guards-and-staging.md`
**Gate File**: co-located at `task.245.gate.1.shared-checkout-safe-guards-and-staging.yml`
**Next Steps**: run /qa-fix for T245-QA-1.

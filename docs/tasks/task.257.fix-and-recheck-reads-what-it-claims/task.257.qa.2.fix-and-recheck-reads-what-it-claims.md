# QA Report: Task 257 - finalise fix-and-recheck reads severity, scope and the named test

**Task**: [Link to task document](./task.257.fix-and-recheck-reads-what-it-claims.md)
**Gate File**: [task.257.gate.2.fix-and-recheck-reads-what-it-claims.yml](./task.257.gate.2.fix-and-recheck-reads-what-it-claims.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-04
**Gate Status**: PASS

---

## Executive Summary

Re-review after the cycle 1 fixes. All three findings are closed, each with a test that went red when its fix was reverted. A refute pass by a fresh reviewer over the whole branch diff found no high-confidence bug.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Cycle 2: the whole branch diff, reviewed to refute (the least-reviewed code is cycle 1's own fixes), by one read-only Explore subagent that ran node against the evaluator. Re-review scope: unscoped (cycle 2 always re-reads the whole diff).

CI on 2048bd6c5f36: pending. Not waited on.

Reviewer time: not measured (completion notice reported 178 s).

### Re-Review Context

| Cycle 1 finding | Status |
| --------------- | ------ |
| T257-CR-1 path guard bypass | ✅ FIXED — the guard judges the normalised form; test red when the backslash check is removed |
| T257-CR-2 TODO/SKIP read as red (and CR-3 `:digit`) | ✅ FIXED — test red when the rejection is removed |
| T257-BOUNDARY-1 unprobeable predicate | ✅ FIXED — `pathInScope` exported and probed: 14 executed, verdict engages |

## New Findings This Cycle

All advisory; none reached high confidence, so none enters the gate.

- **[medium/medium]** `finalise-fix-and-recheck.mjs:259` — `TEST_FILE_SHAPE` is lowercase `.test.X` / `.spec.X` only; `x.TEST.js`, `x_test.go`, `test_foo.py` still count as a test name → case-insensitive, more shapes.
- **[low/medium]** `finalise-fix-and-recheck.mjs:132` — a Files Summary entry written `./src/a.js` or in backticks is refused for the path it names → normalise entries.
- **[low/medium]** `finalise-fix-and-recheck.mjs:294` — a CRLF red line is not read (fails closed) → strip `\r`.
- **[low/low]** `finalise-fix-and-recheck.mjs:276` — any title containing `/` gets the `:digit` boundary → restrict to `.md`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1. Proof rule | PASS | evaluator suite | |
| 2. Severity | PASS | rerun-scope + contract | |
| 3. Scope pathspec | PASS | evaluator suite | |
| 4. Prose, bundles, CHANGELOG | PASS | `bundle:check` clean | |

Tests: `CI=true node --test` over the five touched files: 187 pass, 0 fail. Format check clean. The `ci-tool-skips` failure (zsh absent) is pre-existing.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

## NFR Assessment

- **Performance** PASS. **Reliability** PASS. **Maintainability** PASS.
- **Security** PASS — **Evidence**: measured; **Probes executed**: 14. The corpus's hostile names are outside the probed scope by construction, so the unit tests hold the hostile paths.

## Code Review

mutation-proven: TODO/SKIP rejection reverted → "a TODO or SKIP directive is not a red proof" → covered
mutation-proven: backslash guard reverted → "a path the matcher would normalise…" → covered

See New Findings This Cycle for the advisory bugs.

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 90/100
**Deployment Recommendation**: APPROVED

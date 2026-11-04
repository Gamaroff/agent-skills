# QA Report: Task 257 - finalise fix-and-recheck reads severity, scope and the named test

**Task**: [Link to task document](./task.257.fix-and-recheck-reads-what-it-claims.md)
**Gate File**: [task.257.gate.1.fix-and-recheck-reads-what-it-claims.yml](./task.257.gate.1.fix-and-recheck-reads-what-it-claims.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-04
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are implemented as planned and the four touched suites pass (178 tests). An independent diff reviewer then reproduced two high-confidence defects in the new scope and proof readers, and the new scope predicate cannot be probed by the engine.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (Step 3b). Cycle 1, so a full branch diff, not a refute pass. Mutation proofs were run by the developer step (six, each red then restored); this QA did not re-run them.

CI on e9269126d2c8: pending. Not waited on, per the gate rules.

Step 4b: not run. The changed fenced blocks in `skills/finalise/SKILL.md` are inside a JSON record template with placeholders, so the engine would classify them as placeholder blocks.

Reviewer times: not measured (completion notice reported 325 s).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1. Proof rule | PASS | 49 evaluator tests | Title-and-red-line rule; see CR-2 |
| 2. Severity | PASS | 58 rerun-scope + contract tests | Merge keeps agent grade; see CR-4 |
| 3. Scope pathspec | CONCERNS | evaluator tests | Guard bypass, see CR-1 |
| 4. Prose, bundles, CHANGELOG | PASS | `bundle:check` clean | |

**Overall Phase Completion**: 4/4 implemented; 2 with findings.

---

## Success Criteria Verification

Tests: `CI=true node --test` over the four touched files: 178 pass, 0 fail. `npm run ci:fast`: 7227 pass, 2 fail before fixes; `load-sensitive-marker` was fixed in the developer step; `ci-tool-skips` (zsh absent) fails identically on develop with this branch stashed. Format check clean.

---

## Issues Found

### MEDIUM Severity Issues (3)

- **T257-CR-1** `finalise-fix-and-recheck.mjs:348` — the path guard checks the raw string; `matchesAnyGlob` normalises it first, so a backslash or whitespace form of `..` or a leading `/` gets through. Reproduced: `skills\a\..\..\..\etc\passwd` against `skills/**`.
- **T257-CR-2** `finalise-fix-and-recheck.mjs:253` — `not ok 1 - foo # TODO` and `# SKIP` count as a red for `foo`. Reproduced.
- **T257-BOUNDARY-1** — the scope predicate is a closure; `probes_executed` is 0 for a boundary.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 0

---

## NFR Assessment

### Performance — PASS
Brace expansion capped at 256.

### Reliability — CONCERNS
CR-2; CR-4 (advisory).

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary signals `refused` and `is refused` found in the criteria; `boundary: true`.

### Maintainability — PASS

---

## Code Review

Advisory findings are listed here; the high-confidence bugs were promoted to the gate.

**Correctness bugs (5):**
- [medium/high] `shared/resources/finalise-fix-and-recheck.mjs:348` — guard bypass via normalisation → run the guard on the normalised string (gate T257-CR-1)
- [medium/high] `shared/resources/finalise-fix-and-recheck.mjs:253` — TODO/SKIP accepted as red → reject directives (gate T257-CR-2)
- [medium/medium] `shared/resources/finalise-fix-and-recheck.mjs:253` — `:\d` boundary applies to every test, not only the docs-link clause (CR-3, advisory)
- [medium/medium] `shared/resources/finalise-rerun-scope.js:650` — merged severity can keep `low` over two failing members, copy `null`, or lose a grade (CR-4, advisory)
- [low/medium] `shared/resources/finalise-fix-and-recheck.mjs:348` — `src/./x.js` admitted by `src/*/x.js` (CR-5, folded into T257-CR-1)

**Cleanups (1):**
- [low] CR-6 `finalise-fix-and-recheck.mjs:229` — add a fixture per runner output form so the tightening cannot strand one.

Provenance: the code under review is new in this branch, so none is `pre-existing`.

mutation-proven: none re-run in QA; the developer step proved six reverts red-then-restored (record in the implementation report).

---

## Regression Testing

Bundled copies match (`bundle:check`: 128 skills, 0 problems). The four touched suites pass.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T257-CR-1 and T257-CR-2, each with a failing test first.
2. Export `pathInScope`, probe it, and record the run (T257-BOUNDARY-1).

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4 and CR-6.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL

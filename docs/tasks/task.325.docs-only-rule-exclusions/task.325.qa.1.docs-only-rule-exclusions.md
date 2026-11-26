# QA Report: Task 325 - The docs-only CI rule can exclude a path

**Task**: [task.325.docs-only-rule-exclusions.md](./task.325.docs-only-rule-exclusions.md)
**Gate File**: [task.325.gate.1.docs-only-rule-exclusions.yml](./task.325.gate.1.docs-only-rule-exclusions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

The engine change is right. `isDocsPath` reads a `!` entry as an exclusion in any order, `readConfig` refuses a list of exclusions only and a bare `!`, and every mutation in § 8 turns a named test red. One medium finding: four prose sites route on "matches `ci.docsOnly.patterns`" by reading, not by calling `isDocsPath`, and none of them mentions exclusions.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (6 of 6 boxes)
- [x] Tests passing
- [x] Breaking changes documented (§ 5, CHANGELOG)
- [x] Code on feature branch with open PR (#954)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review

### Review Methodology

Direct tools: 3 phases, a single module, low risk. A traceability matrix was supplied by the pipeline. Diff review: code review (the change set holds `.js` and `.sh` files), one Explore subagent, dispatched and returned in about 80 s (completion notice `duration_ms` 80830).

CI on 7aa55acb9254: pending

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` is changed).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the exclusion in `isDocsPath` | PASS | Verified | `shared/resources/ci-tree-equivalence.js:183-197` |
| Phase 2: usage errors | PASS | Verified | `ci-tree-equivalence.js:783-792` |
| Phase 3: reference, runbook, CHANGELOG, bundle | CONCERNS | Verified | Engine docs right; prose route readers not updated (T325-CR-101) |

**Overall Phase Completion**: 3/3 implemented, 1 with a finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| § 8 table rows | each holds in a test | held | PASS | the five `task.325:` tests, the push-policy case, two reenter cases |
| `patterns: []` → nothing is docs | unchanged | `isDocsPath("docs/a.md", [])` false | PASS | `ci-tree-equivalence.test.mjs` "a path whose NAME starts with `!`…". The `p.length > 0` guard cannot be reached from YAML (an empty `patterns:` is already refused) |
| `qa.testArtifactGlobs` unchanged | no negation | `matchesAnyGlob("docs/catalogue.md", EXCL)` true | PASS | "glob-match itself has no negation" |
| No new `matchesAnyGlob` caller | none | none | PASS | `git grep -nE 'matchesAnyGlob' -- shared/resources`: only the existing callers and the new uses inside `isDocsPath` |
| Every § 8 mutation recorded with the test it turned red | recorded | recorded below | PASS | § Code Review, mutation lines |
| `npm run test:remote` and `bundle:check` pass | pass | pass | PASS | 8904 tests, 0 failed (implementation run, LAN server); 235/235 and 85/85 re-run here at 7aa55acb9; `bundle:check` 0 problems |
| Reference states syntax, any order, usage error | stated | stated | PASS | `docs/reference/configuration.md:308`, `:456` |
| CHANGELOG names both § 5 changes | both | both | PASS | `changelog-cites.sh task.325` → `cites (task 325)` |

**Performance**: not applicable, no bound claimed.

**Code quality**: `npm run validate -- skills/<s>/` exit 0 for develop-batch, develop-bug, develop-next, develop-story, develop-task, finalise. Criteria drift: `clean` (base: review-commit).

---

## Breaking Changes Validation

### Breaking Change 1: a `!` entry now excludes
Documented: Yes. Migration Path Provided: Yes (CHANGELOG: it waits more, never less). Migration Tested: Yes (push-policy case). Consumer Code Updated: N/A.

### Breaking Change 2: a list of exclusions only is refused
Documented: Yes. Migration Path Provided: Yes (`enabled: false`). Migration Tested: Yes (readConfig case). Consumer Code Updated: N/A.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: prose route readers of `ci.docsOnly.patterns` do not mention exclusions (T325-CR-101)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: `shared/resources/qa-docs-only-review-prompt.md:12` and `:19`, `skills/qa-task/SKILL.md:610`, `skills/qa-story/SKILL.md:1115` decide the docs-only claim-check route by "every path matches `ci.docsOnly.patterns`". `skills/finalise/SKILL.md:1535` describes the engine the same way. `docs/catalogue.md` matches `docs/**`, so with `!docs/catalogue.md` these readers still call it documentation.
- **Impact**: an excluded, tested file can take the claim-check route instead of code review.
- **Recommendation**: say at each site that a path matching an entry starting with `!` is code.
- **Priority**: P2

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
No bound claimed.

### Reliability — PASS
All suites green at this head. Usage errors exit 2 and name the key.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (run record `task.325.qa.1.docs-only-rule-exclusions.security.run.json`, `totals.executed` 11, `escaped` 0)
- `isDocsPath` with patterns `["**","!secret/**"]`, path sink. Two hostile cases are accepted: `path.encoded-traversal` and `path.symlink-escape`. Provenance: the same inputs give the same answer on `origin/develop` (`isDocsPath(..., ["**"])` true on base and head), and the task does not name this class, so both are `pre-existing`. `isDocsPath` classifies git path names and never opens them. Routed to `recommendations.future`.
- A first probe with `["docs/**","!docs/catalogue.md"]` read `rejects-every-input`: the corpus's legitimate inputs are not under `docs/`. Not a defect; the run above replaced its record.

### Maintainability — PASS
One predicate; `glob-match.js` unchanged.

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `skills/qa-task/SKILL.md:610` — enumeration risk: the prose readers that route on `ci.docsOnly.patterns` do not mention exclusions → state the exclusion rule at each site. Promoted to `top_issues[]` as T325-CR-101. QA confirmed it by reading each site (not by execution, so 5d does not apply). The reviewer's confidence is recorded unchanged.

**Cleanups (0)**

**Boundary**: `boundary: true` — `isDocsPath` is a classifier whose `false` makes a path code. `probes_executed: 11`, `escaped: 0`. `boundary_signals: []`.

**Mutation proofs** (each applied with the Edit tool on a `cp` snapshot, applied-count checked, restored with `cp`, `cmp` clean):

- mutation-proven: exclusion branch disabled in `isDocsPath` → the four `task.325:` engine tests, the push-policy case, and `an excluded path (!docs/catalogue.md) is code: the fix re-enters` → covered
- mutation-proven: last-match-wins order instead of exclusion-wins → `task.325: an exclusion pattern makes the path it matches code, in any list order` → covered
- mutation-proven: bare-`!` refusal removed → `task.325: readConfig reads an exclusion and refuses a list of exclusions only, or a bare \`!\`` → covered
- mutation-proven: exclusions-only refusal removed → the same readConfig test → covered
- mutation-proven: negation moved into `glob-match.js` (and out of `isDocsPath`) → `task.325: glob-match itself has no negation — qa.testArtifactGlobs keeps its meaning` → covered

Five of five covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `ci-tree-equivalence`, `push-policy`, `finalise-rerun-at-head`, `finalise-delta` | PASS (235/235) |
| `reenter-qa-after-finalise.test.sh` | PASS (85/85) |
| Full `ci:fast` at the code commit | PASS (8904 tests, 0 failed) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/ci-tree-equivalence.js`, the three test files, `docs/reference/configuration.md`, `docs/runbooks/ci-docs-only-skip.md`, `CHANGELOG.md`, the six bundled copies (match the source).

### Test Commands Executed
```bash
command node --test shared/resources/tests/ci-tree-equivalence.test.mjs shared/resources/tests/push-policy.test.mjs shared/resources/tests/finalise-rerun-at-head.test.mjs shared/resources/tests/finalise-delta.test.mjs
bash shared/resources/reenter-qa-after-finalise.test.sh
npm run validate -- skills/<s>/   # six skills
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/ci-tree-equivalence.js#isDocsPath' --args-json '[["**","!secret/**"]]' --record <qa.1>.security.run.json --json
```

### Coverage Report
Not measured (no coverage tool configured for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)
1. T325-CR-101: state the exclusion rule at the prose route readers (P2).

### Short-term Actions (Non-Blocking)
1. Pre-existing: if a reader ever opens the classified paths, decode and realpath them first.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one open medium finding, in documentation that drives a route.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T325-CR-101 fixed.

---

**QA Report**: co-located at `task.325.qa.1.docs-only-rule-exclusions.md`
**Gate File**: co-located at `task.325.gate.1.docs-only-rule-exclusions.yml`
**Next Steps**: `/qa-fix` for T325-CR-101, then QA cycle 2.

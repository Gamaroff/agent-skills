# QA Report: Task 249 - /finalise grades every kind of criterion fairly

**Task**: [task.249.finalise-grades-every-criterion-kind.md](./task.249.finalise-grades-every-criterion-kind.md)
**Gate File**: [task.249.gate.2.finalise-grades-every-criterion-kind.yml](./task.249.gate.2.finalise-grades-every-criterion-kind.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [task.249.gate.1](./task.249.gate.1.finalise-grades-every-criterion-kind.yml), CONCERNS 80/100, with 2 findings.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T249-QA-1: a resolved CI-state PASS is carried to a later run | ✅ FIXED | `scope()` re-judges any `DEFERRED-CI` or `ci_reading` entry as `ci-state`. Tests in both suites; each arm mutation-proven |
| T249-QA-2: the inline case is looked up by id alone | ✅ FIXED | Item 3a now resolves the case through the probe's `key` to entry *i*'s cases file. CR-5 below is a low-confidence residual |
| CR-3 (low): a silent skip on a missing merged result | ✅ FIXED, but see T249-QA-6 | The block HALTs; fence test mutation-proven. Its recovery text is wrong for one of the causes it names |
| CR-4 (cleanup): item 3a order | ✅ FIXED | Item 3 says to run 3a first |

---

## Executive Summary

QA cycle 2 is the refute pass over the whole branch at `75152aa4`. Every cycle 1 finding is fixed, and the fixes are mutation-proven. The refute pass found three new MEDIUM defects, all verified against the code:

- A CI-state verdict cannot be re-graded once graded, which defeats Step 8a's retaken CI reading.
- Step 6 action 2a has no empty-input guards.
- A missing `spec_ref` becomes a security FAIL, against the prompt's own promise.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#805)

### Testing Approach

- [x] Automated Testing (unit, executed snippet)
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools and one read-only Explore reviewer. This was cycle 2, so the reviewer read the whole `origin/develop...HEAD` diff (27 files) with the REFUTE PASS directive appended. It was dispatched at 21:12:09Z and returned in 153 s (`duration_ms` 152752).

Re-review scope: unscoped — cycle 2 refute pass (prior gate CONCERNS, not a safety FAIL; `qa-safety-clause1.sh` → false)

CI on 75152aa4dc6f: pending

- Step 4b: `skills/finalise/SKILL.md` has one changed block, Step 6 action 2a. It is classified `mutating` and was not executed by Step 4b (`changed-blocks-not-executed`). `finalise-deferred-ci.test.mjs` runs it as written under bash. zsh is not installed on this host.
- Standards-named validation: `npm run validate -- skills/<s>/` passed for finalise, review-task, review-story, create-task and create-story.

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:868` — T249-QA-3 (CR-1) → re-grade entries that carry `ci_reading`
- **[medium]** `skills/finalise/SKILL.md:1311` — T249-QA-4 (CR-2) → add Step 3c's empty-input guards
- **[medium]** `skills/finalise/SKILL.md:686` — T249-QA-5 (CR-4) → re-dispatch, then advise; never a FAIL check
- **[low]** `skills/finalise/SKILL.md:1326` — T249-QA-6 (CR-3) → name a recovery that works
- **[low/low]** `skills/finalise/SKILL.md:686` — CR-5, a stale cases file under the same DOD_N → recommendation

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: DEFERRED-CI end to end | CONCERNS | Verified | T249-QA-3, T249-QA-4, T249-QA-6 |
| Phase 2: Process criteria and record location | PASS | Verified (structural pins) | |
| Phase 3: Spec-tied probe verdicts | CONCERNS | Reviewed only | T249-QA-5 |
| Phase 4: Record-location check at review | PASS | Verified (validate) | |

**Overall Phase Completion**: 4/4 implemented, 2 with open findings.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| `computeOverall` is never PASS while any DEFERRED-CI remains | `finalise-deferred-ci.test.mjs`, mutation-proven | PASS |
| Step 6 grades a deferred criterion from CI reading 1 and rebinds `AC_OVERALL` | fence tests in `finalise-deferred-ci.test.mjs` | CONCERNS: passes for one reading. A second reading on the Step 8a path cannot change it (T249-QA-3) |
| A re-run never carries a CI-state verdict | `scope: a CI-state entry … → ci-state` in both suites | PASS |
| The AC prompt defines the process and CI-state kinds; five kinds | `finalise-dod-ac-kinds.test.mjs` | PASS |
| `spec_ref` and `spec_challenges[]`; Step 3b.1 disposition | prose, item 3a | CONCERNS (T249-QA-5) |
| The record-location check in review-task and review-story | validate | PASS |
| `npm run ci:fast` and `bundle:check` | 7028 tests, 0 fail; 0 problems (cycle 1 fix, same tree as `75152aa4`) | PASS |
| CHANGELOG cites task 249 | `changelog-cites.sh` → `cites (task 249)` | PASS |

**Criteria drift**: `clean` (base `review-commit`).

---

## Breaking Changes Validation

None. A prior record with no CI-state entry scopes exactly as before (52 plus 1 scope tests).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

**Issue: T249-QA-3 — a graded CI-state criterion cannot be re-graded**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**:
  - `resolveDeferredCi` selects only `status === DEFERRED-CI` entries.
  - On a FAILURE reading it rewrites them to FAIL in the merged file and the record.
  - Step 8a then retakes CI reading 1 on the fix head (step 3) and re-enters Step 6 (step 5).
  - Action 2a answers `none-deferred`, so `AC_OVERALL` stays FAIL, taken from the red reading Step 8a was meant to replace.
- **Impact**: For any work item with a CI-state criterion, the docs-link fix-and-recheck path can never accept.
- **Recommendation**:
  - Re-grade entries carrying `ci_reading` as well as `DEFERRED-CI` ones.
  - Test with FAILURE followed by SUCCESS on one merged file.

**Issue: T249-QA-4 — Step 6 action 2a skips silently on empty inputs**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: The block HALTs on a leftover `{`, but not on an empty STEM, DOD_N or DOC_DIR. The Step 3a and 3c blocks carry these guards (lines 498–499 and 773–774).
- **Impact**: AC acceptance is refused with no message saying why.
- **Recommendation**: Copy the guards into the block and add a fence test.

**Issue: T249-QA-5 — a missing `spec_ref` becomes a security FAIL**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**:
  - Item 3a adds a FAIL check, and item 6 folds any FAIL check into the overall security verdict.
  - `finalise-dod-security-prompt.md:192` says `/finalise` "does not count the case against security".
- **Impact**: An omission in the agent's plan blocks acceptance, and no code fix can clear it.
- **Recommendation**: Re-dispatch once for a corrected plan, as item 5 does for refusals. If `spec_ref` is still missing, report a non-gating advisory.

### LOW Severity Issues (2)

- **T249-QA-6** `skills/finalise/SKILL.md:1326`: the HALT's recovery text says to re-run Step 3c's merge, but in the "state cleaned" case it names, the merge's own inputs are gone too.
- **CR-5** (low/low) `skills/finalise/SKILL.md:686`: a cases file left over from an earlier plan under the same DOD_N could be read. Recommendation only.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS
No hot path.

### Reliability — CONCERNS
T249-QA-3, T249-QA-4 and T249-QA-5.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 13 (`totals.executed`, `task.249.qa.2.security.run.json`). 0 reproduced, 0 escaped.
- Boundary: `ciResolution`, re-probed with the cycle 1 cases (`task.249.qa.2.security.cases.json`). The criteria classifier still matches `never`.

### Maintainability — PASS

---

## Code Review

Code review is promoted to blocking (`code_review_blocking=true`). CR-1 is `bug` with `confidence: high`, so it was promoted as T249-QA-3. QA verified CR-2, CR-3 and CR-4 against the code and raised them itself as T249-QA-4, T249-QA-6 and T249-QA-5.

**Correctness bugs (5):**
- [medium/high] `shared/resources/finalise-rerun-scope.js:868` — `resolve-ci` grades only DEFERRED-CI entries, so a retaken reading cannot replace a FAIL → re-grade `ci_reading` entries (T249-QA-3)
- [medium/medium] `skills/finalise/SKILL.md:1311` — no empty or numeric guard on STEM, DOD_N or DOC_DIR → copy Step 3c's guards (T249-QA-4)
- [medium/medium] `skills/finalise/SKILL.md:1326` — the recovery can't run in the "state cleaned" case → name a working recovery (T249-QA-6, rated low: the HALT itself is correct)
- [medium/medium] `skills/finalise/SKILL.md:686` — a missing `spec_ref` is folded into a security FAIL → re-dispatch, then advise (T249-QA-5)
- [low/low] `skills/finalise/SKILL.md:686` — a stale cases file under the same DOD_N → read only the current run's `cases_files` (recommendation)

**Cleanups (0)**

All anchors were checked by `finding-anchors.js`: `ok`.

T249-QA-6 was re-rated from the reviewer's medium to low. The HALT fires correctly and stops the run. Only its remedy sentence is wrong, and an operator reading it learns that the state is gone either way. Confidence is unchanged.

**Mutation proofs:**

mutation-proven: `scope()` drops the `ci_reading` arm → "scope: a CI-state entry (resolved PASS or still deferred) → ci-state" + "scope: a prior CI-state criterion … re-judged as ci-state" → covered (dev, cycle 1 qa-fix)
mutation-proven: `scope()` drops the `DEFERRED-CI` arm → the same two tests → covered (QA, scratch worktree)
mutation-proven: Step 6 action 2a CR-3 guard → `elif false` → "fence (bash): a record without its merged result HALTs" → covered (dev, cycle 1 qa-fix)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-rerun-scope.test.mjs` + `finalise-deferred-ci.test.mjs` | PASS 74/74 |
| Full suite (`ci:fast`, same tree) | PASS 7028, 0 fail |
| `bundle:check` | 0 problems |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-rerun-scope.js`, `skills/finalise/SKILL.md` (Step 3a, 3b.1, 3c, 6, 8a), `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/security-probe-plan.mjs` (caller), both test suites

### Test Commands Executed
```bash
npm run ci:fast
command node --test shared/resources/tests/finalise-deferred-ci.test.mjs shared/resources/tests/finalise-rerun-scope.test.mjs
npm run validate -- skills/{finalise,review-task,review-story,create-task,create-story}/
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shared/resources/finalise-rerun-scope.js#ciResolution' --cases-file docs/tasks/task.249.finalise-grades-every-criterion-kind/task.249.qa.2.security.cases.json --record docs/tasks/task.249.finalise-grades-every-criterion-kind/task.249.qa.2.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

### Coverage Report
Not measured: `node --test` runs with no coverage instrument.

---

## Recommendations

### Immediate Actions (Blocking)
1. T249-QA-3, T249-QA-4 and T249-QA-5. T249-QA-6 sits in the same block as T249-QA-4.

### Short-term Actions (Non-Blocking)
1. CR-5: read only the current run's `cases_files`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The cycle 1 findings are fixed, and the refute pass found three verified MEDIUM defects. Two are in code the change itself added: the re-grade path and the new block's input guards.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T249-QA-3, T249-QA-4 and T249-QA-5 are fixed and re-reviewed.

---

**QA Report**: co-located at `task.249.qa.2.finalise-grades-every-criterion-kind.md`
**Gate File**: co-located at `task.249.gate.2.finalise-grades-every-criterion-kind.yml`
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3 (scoped to the files changed since `75152aa4`).

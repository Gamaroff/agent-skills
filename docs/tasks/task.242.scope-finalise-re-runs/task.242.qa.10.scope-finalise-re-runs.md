# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [Link to task document](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.10.scope-finalise-re-runs.yml](./task.242.gate.10.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 10 is the last granted cycle. It re-reviews the cycle-9 fix at `1ee28b5b`, where a token without a slash always goes through the basename rule. The fix holds. Restoring the exact-path-first order turns 3 tests red. Unioning the exact match with the basename rule turns 2 red.

The reviewer found one more gap in citation resolution (QA10-1, medium, high confidence, promoted). A token that contains a slash is matched exactly, with no normalisation. So `./src/a.js:5`, `/src/a.js:5`, `src\a.js:5`, `src/a.js#L5` and `./README.md` resolve to nothing, while `src/a.js:5` resolves. QA reproduced it by execution. No committed record in this repository uses these shapes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-QA9-1: a bare citation that also names a repository-root file resolved to that file alone; in merge a deleted root file still matched | medium | ✅ FIXED | A token with a slash is a path; a token without one goes through the basename maps only (`finalise-rerun-scope.js:152-155`). Mutation 1, the exact-path-first order restored: 3 tests red (the `resolveCitation` root-candidate test, the scope pair, the merge pair) → covered. Mutation 2, the exact match unioned with the basename rule (fixes CR-1, not CR-2): 2 red (the unit test's merge-index assertions and the merge pair) → covered |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`status: ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#781)

### Testing Approach

- [x] Automated Testing (unit, contract)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (independent reviewer)

### Review Methodology

Re-review, direct tools, with one independent Explore reviewer for the diff (Step 3b). The Step 5 mapper supplied a traceability matrix (`.summaries/qa-traceability-matrix.md`). Mutations ran in a scratch worktree at the committed head.

Re-review scope: files changed since gate 9's commit (5 files). Default.

`SAFETY_REPROBE=false`: gate 9 failed on reliability, not on a safety axis.

Uncommitted-change guard: only task 243's `docs/tasks/task-registry.md`, as in cycles 8–9 (observation #126). Recorded as a deviation from the block's HALT.

Diff reviewer: dispatched 2026-10-29T10:43:07Z, returned in 121.5 s (from `duration_ms`).

Step 4b: not applicable. No runnable prose is in the change set.

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:153`: a token with a slash is matched exactly, with no normalisation, so `./src/a.js:5`, `/src/a.js:5`, `src\a.js:5`, `src/a.js#L5` and `./README.md` resolve to nothing. On the scope side such a citation beside an unchanged path carries after its file changes. On the merge side it is counted where the plain form is an advisory. → Normalise tokens before routing and pin both forms to the same answer. (TASK-242-QA10-1. Source: code-review CR-1, high confidence, promoted under `code_review_blocking`.)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–6 | PASS (QA10-1 open in phase 2's engine) | `finalise-rerun-scope.test.mjs` 52/52 | Only `resolveCitation`'s token routing changed since gate 9 |

**Overall Phase Completion**: 18/18 checkboxes.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1–SC-2 (scope behaviour) | PASS with QA10-1 open | 52 pass. QA10-1: a `./`-prefixed path citation beside an unchanged path carries |
| SC-3 (task.239 replay) | PASS | The replay passes |
| SC-4 (merge) | PASS with QA10-1 open | A `./`-prefixed new-member citation is counted where the plain form is an advisory |
| SC-5–SC-9 | PASS | Unchanged since gate 9; contract tests green |
| SC-10 | N/A | No numeric bound claimed |
| SC-11 (mutation proofs) | PASS | Cycle 9's proofs re-run here: 2 of 2 covered |
| SC-12 (`ci:fast`, `bundle:check`) | PASS | Head `1ee28b5b`: `ci:fast` 6802 tests, 6787 pass, 1 fail. The failure is `doc-links.test.mjs`, which checks link targets against the tracked tree: the task document already linked to gate 10 and this report before they were committed. It clears with this commit. `bundle:check` 128 skills, 0 problems. CI on `1ee28b5b`: Docs link check, ShellCheck and Secret scan green |
| SC-13 (CHANGELOG) | PASS | Unchanged |

---

## Breaking Changes Validation

None documented, none introduced. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: a path citation written with `./`, a leading `/`, backslashes or a `#L` anchor resolves to nothing (QA10-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `evidenceIndex(["src/a.js","README.md","tests/a.test.mjs"], {src/a.js})`: `src/a.js:5` → `["src/a.js"]`; `./src/a.js:5`, `/src/a.js:5`, `src\a.js:5`, `src/a.js#L5`, `./README.md` → `[]`. Run with `node -e`.
- **Impact**: a criterion citing one of these shapes beside an unchanged path is carried when its file changed. A new member citing one is counted, so a FAIL on unchanged evidence stands. No committed `*.ac.json` record here uses these shapes.
- **Provenance**: the routing dates from the engine's first commit (`5bcbc5d9`). Cycle 9's comment states it as the contract.
- **Recommendation**: see the gate's `suggested_action`.
- **Priority**: P2

### LOW Severity Issues (0)

None. One cleanup (code-review CR-2: a test comment names the wrong fixture file) is in `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
QA10-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1–9.

### Maintainability — PASS
QA9-1 has committed tests that are mutation-proven.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/finalise-rerun-scope.js:153`: unnormalised path tokens resolve to nothing → normalise before routing. **Promoted as TASK-242-QA10-1.**

**Cleanups (1):**
- `shared/resources/tests/finalise-rerun-scope.test.mjs:1499`: the merge pair test comment says `lib/a.test.mjs`; the fixture has `tests/a.test.mjs`. Advisory.

mutation-proven: exact-path-first order restored → 3 tests red → covered
mutation-proven: exact match unioned with the basename rule → 2 tests red → covered

Pattern note: every cycle since cycle 3 has found a new edge in how a citation token resolves (CR3-1, CR4-1, CR5-1, CR6-1, QA7-1, QA8-1, QA9-1, QA10-1). Cycles 8–9 closed the basename rule. QA10-1 is the first finding on the path side.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole repository (`npm run ci:fast`) | 6802 tests, 6787 pass, 1 fail: the uncommitted gate-10 link targets (see SC-12) |
| Bundled copies (`npm run bundle:check`) | PASS: 128 skills, 0 problems |
| `skills/finalise` (`npm run validate -- skills/finalise/`) | PASS |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/finalise-rerun-scope.js` (and its bundled copy)
- `shared/resources/tests/finalise-rerun-scope.test.mjs`

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
npm run validate -- skills/finalise/
command node --test --test-reporter=tap shared/resources/tests/finalise-rerun-scope.test.mjs
```

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix QA10-1 or record it as an accepted limit in § 3.

### Short-term Actions (Non-Blocking)
1. Fix the test comment (CR-2).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH finding. One medium correctness bug (QA10-1), promoted at high confidence and reproduced by execution.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA10-1 fixed and re-reviewed, or accepted as a recorded limit.

---

**QA Report**: co-located at `task.242.qa.10.scope-finalise-re-runs.md`
**Gate File**: co-located at `task.242.gate.10.scope-finalise-re-runs.yml`
**Next Steps**: the develop-task loop decides. The granted budget (10 cycles) is spent with this gate.

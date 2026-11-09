# QA Report: Task 290 - QA snippet runner reads a # after an escaped space as a comment

**Task**: [Link to task document](./task.290.qa-snippet-runner-comment-after-escaped-space.md)
**Gate File**: [task.290.gate.1.qa-snippet-runner-comment-after-escaped-space.yml](./task.290.gate.1.qa-snippet-runner-comment-after-escaped-space.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Testing Completed**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

The two defects the task names are fixed: `echo a\ # ; touch out` now classifies `mutating`, and a 20000-deep `"$(` no longer throws. The same class is not closed. A backslash outside quotes (an escaped quote, a backslash-newline) still makes the comment scan disagree with bash, and two blocks classify `runnable` and write under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#867)

### Testing Approach

- [x] Automated Testing (316 tests in the engine suite)
- [x] Security Review (probe engine plus hand reproduction)
- [x] Code Review (single direct pass over the engine diff)
- [x] Regression Testing

### Review Methodology

Direct tools; first review of a small single-phase task. Step 3b diff review done inline over the engine and test diff (no subagent dispatched, so no independent reviewer ran). Diff review: code review. Step 4b: the change set touches `qa-runnable-prose-detection.md`; the engine reports 0 changed blocks, so nothing new to execute.

CI on e750f678c849: pending

---

## New Findings This Cycle

Not a re-review. See Issues Found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: One comment rule, iterative `closingParen`, differential test | CONCERNS | Verified (316/316) | Rule and fail-closed catch in place; backslash outside quotes not handled (T290-QA-1) |

**Overall Phase Completion**: 0 of 1 phases passed clean; 1 with an open HIGH finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `echo a\ # ; touch out` and nested forms classify `mutating` | yes | yes | PASS | Probed with the engine |
| Controls `echo a # ; touch out`, `a#b`, `$#` unchanged | yes | yes | PASS | `echo a # ; touch out` runnable, writes nothing |
| No input makes `classifyBlock` throw | yes | yes | PASS | Fail-closed catch; deep-nesting test |
| Docs scan time not regressed by more than 10% | recorded | not re-measured | UNVERIFIED | Developer's scan: 3441 blocks, 0/0 verdict change; timing not recorded in a committed place |
| No extra pass over a block with no `#` and no `$(` | documented | documented | PASS | Reworded as a documentation criterion |
| Every scanner that skips a comment calls the one rule | yes | yes | PASS | Call-site test (sedScan listed as non-shell) |
| Differential test generates at least 200 blocks, executes one | yes | 228 blocks | PASS | Test passes |
| Lint and prettier on changed files | pass | not run separately | UNVERIFIED | `ci:fast` green per the report |
| CHANGELOG updated, `bundle:check` 0 problems | yes | yes | PASS | `changelog-cites.sh`: cites (task 290) |
| Docs scan 0 newly runnable vs develop | 0 | 0 (developer's run) | PASS | See Issues: the strict direction was chosen to hold it |

---

## Breaking Changes Validation

None. Blocks that classified `runnable` through the bug now classify `mutating`.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: A backslash outside quotes still lets the comment scan hide code**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.290.bug.1.backslash-outside-quotes-hides-code-from-comment-scan.md](./task.290.bug.1.backslash-outside-quotes-hides-code-from-comment-scan.md)
- **Observation**: `echo \'a' # ; touch out' ; touch out2` and `echo a\` + newline + `# ; touch out` both classify `runnable`; bash creates `out2` and `out`. Identical on develop.
- **Impact**: QA could execute a block that writes. The task's own Problem 1 is this class, and the task listed the backslash-outside-quotes fix in scope.
- **Recommendation**: Fail closed on a backslash before a quote or a newline outside quotes; add gap rows and differential contexts; re-run the docs scan.
- **Priority**: P1

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- The iterative `closingParen` is not held by a test: with the catch in place a recursive version still returns `mutating` at depth 20000. The developer recorded this.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
Constant-time `startsComment` in existing loops. Quadratic re-masking cost is pre-existing.

### Reliability — PASS
No exception path remains in the classifier entry points.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`shell-exec` sink against `isRunnableBlock`; 0 escaped)
- The corpus passed. The failing inputs come from hand reproduction, because the corpus has no escaped-quote or continuation case.

### Maintainability — PASS
One rule, one call-site test.

---

## Code Review

Single inline pass; no subagent ran.

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1975` — reproduced by execution (origin: code-review, reproduced by QA): the stripper reads a backslash only inside double quotes. Reproductions and control are in the bug report; base `develop` gives the same output, and the task lists the shape in scope, so it is not `pre-existing` (T290-QA-1).

**Cleanups (0):** none.

mutation-proven: none re-run this cycle; the developer's proofs are in the implementation report (escape count → 5 gap rows and the differential test red; fail-closed catch → 2 tests red) → not-run by QA

---

## Regression Testing

`node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 316 pass, 0 fail. `npm run validate -- skills/qa-task/`: pass. Platform variance: no environment-derived path reaches a validating consumer in this diff.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
node --test shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --repo-root "$PWD" --record <run.json> --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/qa-runnable-prose-detection.md --diff-base <merge-base> --json
npm run validate -- skills/qa-task/
```

### Coverage Report
Not measured (no coverage tool configured for this module).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T290-QA-1 (see bug report).

### Short-term Actions (Non-Blocking)
1. Hold the iterative `closingParen` with a test that fails if it is reverted.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH reproduced finding in the task's own defect class.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T290-QA-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.290.qa.1.qa-snippet-runner-comment-after-escaped-space.md`
**Gate File**: co-located at `task.290.gate.1.qa-snippet-runner-comment-after-escaped-space.yml`
**Next Steps**: run `/qa-fix` for T290-QA-1, then re-run `/qa-task`.

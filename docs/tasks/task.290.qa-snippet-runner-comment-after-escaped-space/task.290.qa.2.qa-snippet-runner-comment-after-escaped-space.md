# QA Report: Task 290 - QA snippet runner reads a # after an escaped space as a comment

**Task**: [Link to task document](./task.290.qa-snippet-runner-comment-after-escaped-space.md)
**Gate File**: [task.290.gate.2.qa-snippet-runner-comment-after-escaped-space.yml](./task.290.gate.2.qa-snippet-runner-comment-after-escaped-space.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Testing Completed**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's finding is fixed: an escaped quote outside quotes and a backslash-newline before a `#` line now refuse. A refute pass found one more member of the same backslash class: an even run of backslashes before a newline is joined as a continuation, which hides the next line. `echo a\\` then `touch out` classifies runnable and writes under bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases, tests, PR (#867)

### Testing Approach

- [x] Automated Testing (322 tests in the engine suite)
- [x] Security Review (probe engine plus a 40000-block differential against real bash)
- [x] Code Review (refute pass, whole-branch diff)
- [x] Regression Testing

### Review Methodology

Direct tools. Cycle 2 is a refute pass over the whole branch diff, done inline (no subagent dispatched, so no independent reviewer ran). Diff review: code review. Step 4b: no changed runnable blocks in the prose file.

Re-review scope: files changed since gate 1 are the cycle 1 fix; reviewed against the whole branch diff as the cycle 2 rule requires.

CI on fce7a9bdeae7: pending

---

## Re-Review Context

| Previous issue | Status |
| -------------- | ------ |
| T290-QA-1 (escaped quote, backslash-newline before `#`) | FIXED. Both reproductions now `mutating`; gap rows, controls and differential contexts added; both throws mutation-proven by the developer and re-checked in the 40000-block probe (0 writes from those shapes) |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:2331` — an even run of backslashes before a newline is joined as a continuation → join only an odd run (T290-QA-2, bug 2).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1 | CONCERNS | Verified (322/322) | One further HIGH in the same class |

---

## Success Criteria Verification

Unchanged from cycle 1 except: the docs scan now reads 3442 blocks, 0 newly runnable, 0 newly refused (developer's run, cycle 1 fix). The docs-scan timing criterion is still not re-measured (UNVERIFIED).

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: An even run of backslashes before a newline is joined as a continuation**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.290.bug.2.even-backslash-run-before-newline-joins-lines.md](./task.290.bug.2.even-backslash-run-before-newline-joins-lines.md)
- **Observation**: `echo a\\` + newline + `touch out` classifies runnable; bash creates `out`. 165 of 40000 random blocks, all this shape. Identical on develop.
- **Impact**: QA could execute a block that writes.
- **Recommendation**: Join only an odd run in `commandInvocations`; add gap rows, a control and differential contexts.
- **Priority**: P1

### LOW Severity Issues (1)

- The iterative `closingParen` is still not held by a test.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (0 escaped)
- The corpus passes; the random differential found T290-QA-2.

### Maintainability — PASS

---

## Code Review

Refute pass, inline. Probes for the new throws: bulk shapes (escaped quotes in double quotes, in substitutions, line joins with indentation) refuse or run as bash does; 40000 random combinations with a writer after the shape, executed under bash, wrote nothing except the even-run shape.

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:2331` — even-run join, reproduced by execution (origin: code-review, reproduced by QA). Control: an odd continuation stays one command. Base gives the same output, and the task lists the shape's class in scope, so it is not `pre-existing`.

**Cleanups (0):** none.

mutation-proven: none re-run by QA this cycle → not-run

---

## Regression Testing

`node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 322 pass. `CI=true npm run ci:fast` green per the fix summary.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, its test, `qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
node --test shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --repo-root "$PWD" --record <run.json> --json
node <scratch>/probe5.mjs   # 40000 random blocks, classifier vs real bash
```

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T290-QA-2.

### Short-term Actions (Non-Blocking)
1. Hold the iterative `closingParen` with a test.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH reproduced finding in the backslash class.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T290-QA-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.290.qa.2.qa-snippet-runner-comment-after-escaped-space.md`
**Gate File**: co-located at `task.290.gate.2.qa-snippet-runner-comment-after-escaped-space.yml`
**Next Steps**: `/qa-fix` for T290-QA-2, then re-run `/qa-task`.

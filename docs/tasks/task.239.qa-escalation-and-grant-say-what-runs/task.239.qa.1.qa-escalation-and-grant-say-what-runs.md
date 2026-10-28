# QA Report: Task 239 - QA escalation and grant say what will run

**Task**: [Link to task document](./task.239.qa-escalation-and-grant-say-what-runs.md)
**Gate File**: [task.239.gate.1.qa-escalation-and-grant-say-what-runs.yml](./task.239.gate.1.qa-escalation-and-grant-say-what-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #779 at `32ecb0e7`. All four phases are delivered, the affected suites and validation pass, and an independent mutation of the window default turns two tests red. The independent diff review found one real gap in the new third-strike rule: it is right for a not-converging grant and wrong for a loop-limit grant. It also found four low gaps in coverage and docs.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-239-QA1-CR-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`ready-for-review`)
- [x] All implementation phases completed (checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented (none; the result line gains a trailing token)
- [x] Code on feature branch with open PR (#779)

### Testing Approach

- [x] Automated Testing (shell suite, node test files)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (independent subagent)

### Review Methodology

Direct tools, plus one read-only Explore subagent for the diff code review (dispatched 19:48Z; returned after 196 s by its completion notice's `duration_ms`). First review, so the whole branch diff was in scope: `origin/develop...HEAD`, excluding generated `skills/*/references/*` copies and `docs/tasks/*`. That is 874 lines over 18 files. The anchor checker read all five findings as `ok` or `unchecked-text`.

CI on 32ecb0e7ee08: pending

Step 4b: changed blocks 0 in all five changed prose files (both SKILL.md, pause, resume contract, step-5-6); the change touched no fenced bash block. The one execution failure (resume contract line 492, `jq` cannot open the lock) reproduces identically on the merge base, so it is pre-existing and recorded under `recommendations.future`.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2082`: the third-strike comparison is "exactly as 5b would on re-entry" only for a not-converging grant. On a loop-limit grant, a file struck at the last two gates is left out, and the escalation may recommend a patch that the resumed 5b refuses. Fix: list the two-strike files on a loop-limit escalation. Bug: [task.239.bug.1](./task.239.bug.1.third-strike-files-miss-loop-limit-strikes.md)
- **[low]** `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:143`: `hooksDoc` and `detectorPrompt` do not name the new field, and the test does not require them to. Fix: name the field in both and add both to the participant list.
- **[low]** `evals/develop-{task,story}/step-isolation/12-…/scenario.json`: the replay locks lack `convergence_from_cycle: 7`. Fix: add it to both locks and assert it.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:622`: a missing lock reads as nothing, not as the documented `1`. Fix: say to restore the lock before the check runs.
- **[low]** `evals/shared/tests/qa-escalation-template.test.mjs:124`: the worked-example table is not checked against the mirror function. Fix: parse the table rows and assert each one.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: grant window | PASS | Verified | jq write, result token, step 3 clause, schema row; 5 new grant cases |
| Phase 2: label | PASS | Verified | the `git grep` sweep finds no old label; 10 sites carry the new one |
| Phase 3: escalation templates | CONCERNS | Partial | the loop-limit third-strike case is wrong (CR-1) |
| Phase 4: guards | CONCERNS | Partial | the table is untested and two describers are not held (CR-2, CR-5) |

**Overall Phase Completion**: 4/4 delivered, 2 with issues

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 | PASS | `grant-qa-cycles.test.sh`: both halt kinds, an existing lock, a second grant and a refused grant. 56/56 pass |
| SC-2 | PASS | `qa-escalation-template.test.mjs` window test with a control. QA mutation `// 1`→`// 0` turns 2 red (covered) |
| SC-3 | PASS | label-sweep test; SKILL.md:334/347 report from `reenter_at=` |
| SC-4 | CONCERNS | true for not-converging; loop-limit gap (CR-1) |
| SC-5 | PASS | template test asserts the Flat-count line; the formula diff is the window clause only |
| SC-6 | PASS | SKILL.md Phase 0b: one `grant-qa-cycles.sh` call, no new call |
| SC-7 | PASS | filling rule 1 runs the existing comparison once, by pointer |
| SC-8 | PASS | `npm run ci:fast` rc 0 at Step 3 on this content; affected suites rerun green here |
| SC-9 | PASS | `npm run bundle:check`: 0 problems |
| SC-10 | PASS | `npm run validate` passes for develop-task and develop-story |
| SC-11 | PASS | commit `8841eb70` records M1–M4 |
| SC-12 | PASS | the absent-field control case (`7,7,7` trips at 3) |
| SC-13 | PASS | the CHANGELOG `[Unreleased]` entry names the label, the window, the third-strike rule and the flat-count reading |

---

## Breaking Changes Validation

None. Existing `reenter_at=` readers use an unanchored `grep -q` (`grant-qa-cycles.test.sh:84,104`), so a trailing token is safe.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: third-strike files miss a loop-limit grant's two-strike files**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.239.bug.1.third-strike-files-miss-loop-limit-strikes.md](./task.239.bug.1.third-strike-files-miss-loop-limit-strikes.md)
- **Observation**: A loop-limit grant re-enters at 5a, so the resumed 5b compares a different three gates than the escalation did.
- **Impact**: the escalation can recommend a patch that the run refuses.
- **Recommendation**: list the two-strike files on a loop-limit escalation and forbid a patch recommendation for them.
- **Priority**: P2

### LOW Severity Issues (4)

CR-2, CR-3, CR-4 and CR-5, as listed under New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
One extra `jq` read on the result line.

### Reliability — PASS
The atomic write keeps its shape, and a refused grant writes no field (tested).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The diff adds no accept/reject predicate: it adds one field to an existing atomic write, one result-line token, prose, and test code. The only predicate-shaped function, `convergenceTrip`, lives in a test file and is not shipped. The grant script's refusal paths are unchanged.

### Maintainability — CONCERNS
Two documents that describe the lock fields omit the new field, and nothing holds them to it (CR-2).

---

## Code Review

Advisory, except where promoted under `code_review_blocking=true` (high-confidence bugs only: CR-2). QA confirmed CR-1, CR-3 and CR-4 by reading the tree and entered them in `top_issues[]` as its own findings.

**Correctness bugs (4):**
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2082`: loop-limit third-strike gap → TASK-239-QA1-CR-1
- [low/high] `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:143`: participant list → TASK-239-QA1-CR-2 (promoted)
- [low/medium] `evals/develop-task/step-isolation/12-qa-reentry-after-loop-limit-with-grant/scenario.json:4`: replay locks → TASK-239-QA1-CR-3
- [low/low] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:622`: missing lock → TASK-239-QA1-CR-4

**Cleanups (1):**
- `evals/shared/tests/qa-escalation-template.test.mjs:124`: parse the table rows → TASK-239-QA1-CR-5

boundary: false. The diff adds no predicate-shaped shipped function; the only candidate is `convergenceTrip`, which is test code. probes_executed: 0.

mutation-proven: `convergence_from_cycle // 1` → `// 0` in step-5-6 → `qa-escalation-template.test.mjs` window-clause test + parity absent-default assertion went red → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `grant-qa-cycles.test.sh` (all prior cases) | PASS 56/56 |
| `qa-loop-lock-fields-parity.test.mjs` (prior tests) | PASS 9/9 |
| `npm run ci:fast` (Step 3, same content) | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/grant-qa-cycles.test.sh
command node --test evals/shared/tests/qa-escalation-template.test.mjs evals/shared/tests/qa-loop-lock-fields-parity.test.mjs
npm run validate -- skills/develop-task/
npm run validate -- skills/develop-story/
npm run bundle:check
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 779
```

### Coverage Report
Not measured: shell and prose deliverables; coverage is by named assertion and mutation.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium functional gap in the new rule, plus four low gaps.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-239-QA1-CR-1 fixed

---

**Next Steps**: `/qa-fix` on gate 1, then re-review (cycle 2 is a full refute pass).

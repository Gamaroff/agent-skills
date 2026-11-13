# QA Report: Task 298 - review-task runs a plan's command and checks CI parity

**Task**: [Link to task document](./task.298.review-task-runs-plan-command-and-ci-parity.md)
**Gate File**: [task.298.gate.1.review-task-runs-plan-command-and-ci-parity.yml](./task.298.gate.1.review-task-runs-plan-command-and-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Testing Completed**: 2026-11-13
**Gate Status**: CONCERNS

---

## Executive Summary

The change adds review-task check 31 and a matching create-task item, with a presence test. Both rules are stated at their sites and every check run is green. One defect: the new test asserts its check is the highest-numbered in the list, so the next check added to review-task turns it red.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#897)

### Testing Approach

- [x] Automated Testing (new test 7/7; nine sibling tests that read review-task/SKILL.md, all exit 0)
- [x] Regression Testing
- [x] Code Review (inline)
- [ ] Manual Testing
- [ ] Performance Testing

### Review Methodology

Direct tools, no parallel agents. Diff review (Step 3b) ran inline, not through a dispatched subagent, so the independence of that review was lost. Diff review: code review (the change set holds one code path, the test file).

CI on 8ee45815e19c: pending.

Step 4b: ran over both changed skill files. No fenced block was changed (`changed.total` 0 in each). `review-task/SKILL.md` carries the file-level `zero-blocks-executed` finding (4 placeholder blocks, 19 mutating), `create-task/SKILL.md` the `no-executable-blocks` note. Both describe blocks this change did not touch.

---

## New Findings This Cycle

First review, so every finding is new.

- **[medium]** `tests/review-run-and-parity-checks.test.js` (test "the new check exists and is the last item of the Step 3 list") — asserts the new check is the highest-numbered item → keep the existence assertion and drop the equality (see T298-QA-1).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the review check | PASS | Verified | Check 31 at `skills/review-task/SKILL.md`; trigger, safe forms, fallback, worked example, severities; named in the three list sites |
| Phase 2: the create-task item | PASS | Verified | Bullet in § 3.5 Should Add with the five parity dimensions and the check 23 contrast |
| Phase 3: tests and bundle | CONCERNS | Verified | 7 tests pass; one assertion is brittle (T298-QA-1) |

**Overall Phase Completion**: 3/3 phases delivered; 1 with a finding

---

## Success Criteria Verification

**Functional**

| Criterion | Status | Evidence |
| --- | --- | --- |
| review-task states the check with trigger, safe form, fallback, severity | PASS | `skills/review-task/SKILL.md` check 31; held by `tests/review-run-and-parity-checks.test.js` (tests 3, 4, 5) |
| create-task § 3.5 carries the parity item | PASS | bullet "CI scripts run in a new environment"; held by test 6 and 7 |

**Performance**

| Criterion | Status | Evidence |
| --- | --- | --- |
| The check permits only a dry-run or scratch form | PASS | check 31 text: "never the real target", "Never improvise a flag"; held by test 3 |

**Code Quality**

| Criterion | Status | Evidence |
| --- | --- | --- |
| `bundle:check`, `format:check`, `ci:fast` pass | PASS | `bundle:check` 129 skills, 0 problems; Prettier clean on the test and CHANGELOG; `ci:fast` green on the LAN server per the implementation report |

**Migration**

| Criterion | Status | Evidence |
| --- | --- | --- |
| CHANGELOG entry | PASS | `[Unreleased]` → Added cites (task 298); `changelog-cites.sh` reports it |

Criteria drift: `clean` against the review commit.

---

## Breaking Changes Validation

None documented, none found. **Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the new test breaks when a later check is added (T298-QA-1)**

- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: test "the new check exists and is the last item of the Step 3 list" requires `item.number === highestNumber(step3)`. Appending a check 32 to a scratch copy of `skills/review-task/SKILL.md` and running with `REVIEW_RUN_PARITY_ROOT` pointed at it gives 6 pass, 1 fail. The unmutated tree gives 7 pass. Control: the other six tests stay green on the mutant, so only this assertion is positional.
- **Impact**: the next task that adds a review-task check fails CI on a test unrelated to its change.
- **Recommendation**: keep "the check exists" and check that its number is at least 31 and at most the highest, then rename the test.
- **Provenance**: new in this change (the test file is new), so not pre-existing.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS

No runtime code. The test runs in about 0.1 s.

### Reliability — CONCERNS

The test goes red on a benign future change (T298-QA-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The diff is two Markdown rules and a presence test, with no accept/reject predicate. `probe-boundary-signals.mjs` returned an empty list for the criteria. `boundary: false`.

### Maintainability — PASS

The check follows the shape of checks 20 to 30. The test derives the number rather than typing it in.

---

## Code Review

**Correctness bugs (1):**

- [medium/medium] `tests/review-run-and-parity-checks.test.js` (the "last item" test) — asserts the new check is the highest-numbered item; a later check turns it red → drop the equality (promoted to T298-QA-1 by QA, which reproduced it; origin: code-review, reproduced by QA)

**Cleanups (0):** none.

Reproduction: a scratch root under the session scratchpad with a check 32 appended; command `REVIEW_RUN_PARITY_ROOT=<scratch root> node --test tests/review-run-and-parity-checks.test.js`. Result 6 pass, 1 fail. Control: the real tree, 7 pass. The scratch copy was edited with the Edit tool and the working tree was untouched (`git status` shows only the implementation report).

mutation-proven: appended a check 32 → "the new check exists and is the last item of the Step 3 list" → covered (a committed test goes red, and that red is the defect).

The developer's three mutation proofs (drop the no-safe-form clause, drop the create-task bullet, rename check 31) are in the implementation report and were not re-run this cycle.

---

## Regression Testing

The nine other tests that read `skills/review-task/SKILL.md` all exit 0: `create-task-authoring-evidence`, `key-lookup-single-statement`, `outcome-reachability-check`, `review-call-site-population-check`, `review-plan-shape-checks`, `review-property-checks`, `review-task-measured-criterion`, `unbound-default-reads`, `untrusted-content-rule`. `npm run validate` passes for both changed skills.

---

## Test Artifacts

### Files Reviewed

`skills/review-task/SKILL.md`, `skills/create-task/SKILL.md`, `tests/review-run-and-parity-checks.test.js`, `CHANGELOG.md`, the task document.

### Test Commands Executed

```bash
node --test tests/review-run-and-parity-checks.test.js
node --test <each file from: git grep -l "review-task/SKILL.md" -- tests>
npm run validate -- skills/review-task/
npm run validate -- skills/create-task/
npm run bundle:check
prettier --check tests/review-run-and-parity-checks.test.js CHANGELOG.md
REVIEW_RUN_PARITY_ROOT=<scratch root> node --test tests/review-run-and-parity-checks.test.js
```

### Coverage Report

Not applicable: Markdown rules and one test file.

---

## Recommendations

### Immediate Actions (Blocking)

1. T298-QA-1: relax the positional assertion.

### Short-term Actions (Non-Blocking)

1. One sentence in check 31 on removing a scratch target after the run (see the gate's `recommendations.future`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the rules and their tests are in place and green; one assertion is brittle.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix T298-QA-1.

---

**QA Report**: co-located at `task.298.qa.1.review-task-runs-plan-command-and-ci-parity.md`
**Gate File**: co-located at `task.298.gate.1.review-task-runs-plan-command-and-ci-parity.yml`
**Next Steps**: `/qa-fix`, then a second QA cycle (a full refute pass).

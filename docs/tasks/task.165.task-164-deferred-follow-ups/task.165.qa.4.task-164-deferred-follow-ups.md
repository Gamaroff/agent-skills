# QA Report: Task 165 - Close task.164's deferred follow-ups (cycle 4)

**Task**: [Link to task document](./task.165.task-164-deferred-follow-ups.md)
**Gate File**: [task.165.gate.4.task-164-deferred-follow-ups.yml](./task.165.gate.4.task-164-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: FAIL

---

## Executive Summary

This cycle re-enters QA after `/finalise` DoD run 1 found gaps AC3 and AC8, which commit `9dd5d892` closes with a decoy-arm test. The test holds the clause and is mutation-proven. It also breaks the suite: the repository's relationship-assertion lint refuses its substring-style assertion, so `ci:fast` fails 1 of 6394 tests.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Source | Status |
| --- | --- | --- |
| AC3: no per-PR test for the decoy `NEXT=` arm clause | dod.1 | ✅ FIXED, with the decoy test in `9dd5d892`. Mutation (anchor reverted to the first `--skill)`) turns it red |
| AC8: mutation M4 has no lasting test | dod.1 | ✅ FIXED, by the same test |
| Gate 3 `top_issues` | gate.3 | none (PASS) |

## Testing Scope

### Review Methodology

Direct tools, with one diff-review subagent (re-review, a single changed file). The reviewer was dispatched at 16:24Z and returned in 78s (`duration_ms` 78087).

Re-review scope: files changed since gate 3 (head 239b2eb4aa64; 1 file) — default

Step 4b: not applicable. No runnable prose in the change set.

---

## New Findings This Cycle

- **[high]** `shared/resources/tests/step-8-completion-checklist.test.mjs:1099`: the decoy test's `anchored && anchored.includes("finalise→8")` is refused by `tests/relationship-assertion-lint.test.js` (rule A), and `ci:fast` is red → assert on the parsed mapping objects (`a.name === "finalise" && a.next === 8`) (QA4-1)
- **[medium/medium, advisory]** CR-1: `namesSkill` has no positive control (it was cycle-2 CR-6, re-rated by this reviewer)
- **[low/low, advisory]** CR-2: the hook-floor check is not anchored to the NEXT=8 branch
- **[cleanup]** CR-3: the `/?` in `namesSkill` is redundant

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Exception 2 | PASS | Verified | Unchanged since gate 3 |
| Phase 2: Pins | CONCERNS | Partial | The decoy test holds the clause but fails the lint (QA4-1) |
| Phase 3: 4b early exit | PASS | Verified | Unchanged |
| Phase 4: Review-skill gates | PASS | Verified | Unchanged; probed at gate 3 and dod.1 |
| Phase 5: Proof and gates | CONCERNS | Partial | `ci:fast` red |

**Overall Phase Completion**: 3/5 clean

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| HALT pin parses the mapping from the `case "$SKILL_NAME"` block; decoy not read | PASS | `step-8-completion-checklist.test.mjs` decoy test, mutation-proven |
| `ci:fast` passes with `.agents/skills` moved aside | FAIL | 6379/6394 pass, 1 fail (`relationship-assertion-lint.test.js:424`) |
| Each Phase 5 mutation behaves as stated | PASS | M4 now has a lasting test |
| Others | PASS | Unchanged since gate 3 |

---

## Breaking Changes Validation

None. The change is test-only.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the new test fails the relationship-assertion lint**
- **Severity**: HIGH
- **Category**: Quality
- **Observation**: `tests/relationship-assertion-lint.test.js` reports `step-8-completion-checklist.test.mjs:1099 [rule A]`, `anchored && anchored.includes("finalise→8")`
- **Impact**: the suite is red at `9dd5d892`, so CI `test` will fail
- **Recommendation**: key the assertions on the parsed `{name, next}` objects
- **Priority**: P0

**Total Issues**: HIGH: 1, MEDIUM: 0 (gate), LOW: 0 (gate). The 3 advisory review findings are listed above

---

## NFR Assessment

### Performance — PASS
The DoD re-measure on `d774d71a` read 11.230s at base and 0.397s at head.

### Reliability — PASS
No runtime code changed.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 this cycle. The change is a test file, so `boundary: false`. The gates were probed at gate 3 (22 cases) and dod.1 (22 cases), and neither has changed since.

### Maintainability — PASS
The new test is targeted and has a control. Its lint failure is QA4-1.

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `shared/resources/tests/step-8-completion-checklist.test.mjs:1055`: `namesSkill`'s self-check only tests that it does not match, so a matcher that never matches would pass the refusal loop → add positive controls
- [low/low] `shared/resources/tests/step-8-completion-checklist.test.mjs:675`: `some` accepts any `COMPLETION_LINE=`/`ALREADY_DONE=` assignment, not only the NEXT=8 branch's → anchor to that branch

**Cleanups (1):**
- `shared/resources/tests/step-8-completion-checklist.test.mjs:694`: the `/?` is redundant except at string start

No finding is `bug` + `high` confidence, so none is promoted. Anchors: `finding-anchors.js` returned `ok` (3/3 `ok`). QA4-1 comes from the test run, not from the reviewer.

boundary: false. The change set adds a test, not a predicate that accepts or rejects input.

mutation-proven: SKILL_MAPPING reverted to the first-`--skill)` anchor → "the mapping parse does not read a decoy NEXT= arm in the early-exit --skill) branch" → covered

---

## Regression Testing

The full `ci:fast` run had 1 failure, the lint. Every other suite passed.

---

## Test Artifacts

### Test Commands Executed
```bash
mv .agents/skills .agents/skills.aside-qa4; npm run -s ci:fast; mv .agents/skills.aside-qa4 .agents/skills   # GATE_EXIT=1, 6394 tests, 1 fail
command node --test tests/relationship-assertion-lint.test.js                                               # 30 pass, 1 fail
command node --test --test-name-pattern=decoy shared/resources/tests/step-8-completion-checklist.test.mjs   # mutated: 0 pass, 1 fail; restored, cmp ok
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a new test introduced this cycle makes the suite red (QA4-1, high).
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` for QA4-1, then QA cycle 5

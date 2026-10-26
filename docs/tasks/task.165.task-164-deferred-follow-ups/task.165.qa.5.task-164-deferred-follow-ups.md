# QA Report: Task 165 - Close task.164's deferred follow-ups (cycle 5)

**Task**: [Link to task document](./task.165.task-164-deferred-follow-ups.md)
**Gate File**: [task.165.gate.5.task-164-deferred-follow-ups.yml](./task.165.gate.5.task-164-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: PASS

---

## Executive Summary

Cycle 5 verifies the fix for QA4-1. The decoy-arm test now asserts on the parsed mapping arms. It passes the relationship-assertion lint, the full fast gate is green, and CI passes on the head. DoD gaps AC3 and AC8 stay closed.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Source | Status |
| --- | --- | --- |
| QA4-1: the decoy test fails the relationship-assertion lint | gate.4 | ✅ FIXED in `800f7219`. The lint passes 31/31 and `ci:fast` has 0 failures |
| AC3 / AC8: no lasting test for the decoy arm | dod.1 | ✅ FIXED. The decoy test is mutation-proven (below) |

## Testing Scope

### Review Methodology

Direct tools, with one diff-review subagent that returned in 70s (`duration_ms` 69691).

Re-review scope: files changed since gate 4 (head 9dd5d8927624; 4 files) — default

Step 4b: not applicable. No runnable prose in the change set.

---

## New Findings This Cycle

None. The reviewer re-read the test file against `advance-pipeline-lock.sh`, `develop-pipeline-on-stop.sh` and the banner doc. It returned the same three advisory findings as cycle 4 (CR-1, CR-2, CR-3), none high-confidence, all routed to future work.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Exception 2 | PASS | Verified | Unchanged |
| Phase 2: Pins | PASS | Verified | The decoy test is lint-clean and mutation-proven |
| Phase 3: 4b early exit | PASS | Verified | Unchanged |
| Phase 4: Review-skill gates | PASS | Verified | Unchanged; probed at gate 3 and dod.1 |
| Phase 5: Proof and gates | PASS | Verified | `ci:fast` green |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| HALT pin parses the mapping from the `case "$SKILL_NAME"` block; decoy not read | PASS | `step-8-completion-checklist.test.mjs` decoy test (mutation: covered) |
| `ci:fast` passes with `.agents/skills` moved aside | PASS | 6394 tests, 0 fail |
| Each Phase 5 mutation behaves as stated | PASS | M4 is held by the decoy test |
| CI on the PR head | PASS | 6/6 SUCCESS @ `800f7219` |

---

## Breaking Changes Validation

None.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (gate). There are 3 advisory review findings

---

## NFR Assessment

### Performance — PASS
No runtime change. The DoD re-measure on `d774d71a` read 11.230s at base and 0.397s at head.

### Reliability — PASS
No runtime code changed.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 this cycle. The change is a test file, so `boundary: false`. The gates were probed at gate 3 and dod.1 (22 cases each), and neither has changed since.

### Maintainability — PASS
The decoy test is lint-clean and has a loose-anchor control.

---

## Code Review

**Correctness bugs (2):**
- [medium/medium] `shared/resources/tests/step-8-completion-checklist.test.mjs:1055`: `namesSkill` has only a negative self-check → add positive controls
- [low/low] `shared/resources/tests/step-8-completion-checklist.test.mjs:674`: the hook check accepts any branch's assignment → anchor it to NEXT=8

**Cleanups (1):**
- `shared/resources/tests/step-8-completion-checklist.test.mjs:694`: the `/?` and the hyphen escape are redundant

None is promoted (no `bug` + `high`). Anchors: `finding-anchors.js` returned `ok`.

boundary: false. The change set is a test, not a predicate over input.

mutation-proven: SKILL_MAPPING reverted to the first-`--skill)` anchor → "the mapping parse does not read a decoy NEXT= arm in the early-exit --skill) branch" → covered

---

## Regression Testing

The full `ci:fast` run passed, and so did CI on `800f7219`.

---

## Test Artifacts

### Test Commands Executed
```bash
mv .agents/skills .agents/skills.aside-qa5; npm run -s ci:fast; mv .agents/skills.aside-qa5 .agents/skills   # GATE_EXIT=0, 6394 tests, 0 fail
command node --test tests/relationship-assertion-lint.test.js                                               # 31 pass
gh pr view 757 --json statusCheckRollup                                                                      # 6/6 SUCCESS @ 800f7219
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: the cycle-4 finding is fixed and verified, with no new findings.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c PR review, then `/finalise`

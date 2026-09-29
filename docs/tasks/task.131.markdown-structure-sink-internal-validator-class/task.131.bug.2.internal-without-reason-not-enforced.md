# Bug Report: Task 131 - `boundary: internal` without a reason renders FAIL but cannot fail the DoD

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (success-criteria verification; code review CR-2)
**Date Found**: 2026-09-30

## Description

Success criterion: "A finalise run whose security agent returns `boundary: internal` renders a skip with the reason; without a reason it is a FAIL". Finalise Step 3d renders the ❌ line. But the acceptance decision (Step 6, `SKILL.md:727`) reads only `SEC_OVERALL`, which is the agent's self-reported `overall`, and the prompt names no FAIL check the agent must emit for this case. The zero-guard, by contrast, names its check: `probe mode executed no candidates`.

## Expected Behavior

An `internal` with no `internal_reason` makes the security result FAIL. Either the agent emits a named FAIL check, or finalise forces `SEC_OVERALL` to FAIL on that shape, or both.

## Actual Behavior

An agent that returns `boundary: internal`, no reason and `overall: PASS` is accepted, while its own summary shows a FAIL line.

## Impact

The one safeguard that keeps `internal` from being a way around the zero-guard is not enforced.

## Recommendation

Name the check in the prompt (Step 4 and the schema notes): `internal boundary recorded without a reason`. In finalise Step 3c, force `SEC_OVERALL = FAIL` when `boundary == "internal"` and `internal_reason` is empty. Pin both in `finalise-dod-prompt-contract.test.mjs`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: The render rule was stated, but the decision Step 6 takes reads `SEC_OVERALL`, the agent's self-reported overall, and the prompt named no check for the shape.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Prompt: a reason-less `internal` now requires a `status: FAIL` check named `internal boundary recorded without a reason` and `overall: FAIL` (zero-guard paragraph and the Omitting-a-field paragraph). finalise Step 3c: `boundary: internal` with no `internal_reason` forces `SEC_OVERALL = FAIL` whatever the agent's `overall` says. probe-boundary-rule.md names the check and the override.

**Files Modified**: `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `shared/resources/probe-boundary-rule.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (+ bundled copies).

**Testing**: Two new assertions in the `task.131: boundary: internal …` contract test. Mutation-proven: removing the Step 3c override → red; removing the named check from the prompt → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 1 |
| 2026-09-30 | In Progress | qa-fix | Investigation |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 1) |

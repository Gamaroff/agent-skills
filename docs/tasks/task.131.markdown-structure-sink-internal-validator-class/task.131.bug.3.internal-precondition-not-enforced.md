# Bug Report: Task 131 - The precondition of boundary: internal is asserted, not enforced

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute review, verified)
**Date Found**: 2026-09-30

## Description

`boundary: internal` is available only when no corpus sink fits the predicate's input shape. Finalise Step 3c enforces only that some `internal_reason` is present, so the precondition itself is never checked.

## Expected Behavior

An `internal` for an entry a sink is documented to fit (today `report-lint.js#lintReport`), or whose reason is the schema's placeholder text, forces the security result to FAIL; the reason names the entry so the check can be made.

## Actual Behavior

An agent returns `boundary: internal`, `internal_reason: "the artefact, and why no sink fits"` for lintReport, `overall: PASS` — accepted, zero-guard skipped. `anti-patterns.md` says this cannot happen.

## Recommendation

Require `internal_reason` to begin with the entry (`path#export`), keep a disqualified-entries list in the prompt beside the rule, and force `SEC_OVERALL = FAIL` in Step 3c on a disqualified entry or the placeholder reason. Reword the anti-patterns claim to what is enforced.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: Only the reason's presence was checked; the precondition lived in prose.

**Fix Description**: `internal_reason` must begin with the entry as `path#export`; the prompt carries an *Entries disqualified from `internal`* table (today `report-lint.js#lintReport` → `markdown-structure`); finalise Step 3c forces `SEC_OVERALL = FAIL` when the reason is absent, whitespace-only, names no entry, or names a disqualified entry; the Step 3d render uses the same four conditions; the schema placeholder became `<path#export> — …` so it can never pass; anti-patterns.md now states only what is enforced.

**Files Modified**: `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `shared/resources/probe-boundary-rule.md`, `docs/reference/anti-patterns.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (+ bundled copies)

**Testing**: Contract-test pins for the entry requirement, the disqualified table and the empty-reason clause; mutation-proven (each removed → red).

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 2) |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 3 (gate.3) |

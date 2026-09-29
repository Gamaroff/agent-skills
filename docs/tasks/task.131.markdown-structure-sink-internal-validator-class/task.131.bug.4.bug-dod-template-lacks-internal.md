# Bug Report: Task 131 - The bug-mode DoD template has no boundary: internal shape

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute review, verified)
**Date Found**: 2026-09-30

## Description

`skills/finalise/assets/bug-dod-template.md` Step 3 placeholder offers only `boundary: true` / `boundary: false`. The enumeration test scans `skills/<d>/*.md` only, not `assets/`, and its keys do not match this wording.

## Expected Behavior

Bug mode renders the same three decisions as story/task mode, including the reason-less FAIL.

## Actual Behavior

A bug-mode DoD has no place for `internal`; the enumeration test cannot see the site.

## Recommendation

Add the `internal` shape to the placeholder; extend the test roots to `skills/*/assets/*.md` with a key for this sentence.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: The enumeration test's roots and keys did not reach `skills/*/assets/`.

**Fix Description**: The bug-mode template's Step 3 placeholder offers `boundary: internal` with its reason, and the ❌ FAIL shape; the enumeration test scans `skills/*/assets/*.md` with a key for the template's sentence (floor 5).

**Files Modified**: `skills/finalise/assets/bug-dod-template.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (+ bundled copies)

**Testing**: Mutation-proven: removing `boundary: internal` from the template → enumeration test red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 2) |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 3 (gate.3) |

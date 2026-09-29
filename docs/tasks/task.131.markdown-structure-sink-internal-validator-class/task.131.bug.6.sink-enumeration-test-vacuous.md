# Bug Report: Task 131 - The sink-enumeration test is satisfied by a mention anywhere in the prompt

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 review CR-1, verified)
**Date Found**: 2026-09-30

## Description

`every sink is named in each prompt that enumerates the sinks` checks for a backticked sink name anywhere in the whole prompt. On `develop`, `finalise-dod-security-prompt.md` already named `filename` in a shell-form comment, while its `Sinks:` list omitted it. The test would have passed on that drift.

## Expected Behavior

The test reads the enumeration itself: the prompt's `Sinks:` sentence, and in `security-review-prompt.md` the `SINKS` sentence and the Choosing-the-sink table.

## Actual Behavior

Any backticked mention anywhere satisfies it.

## Recommendation

Extract the enumeration text by an anchor. Assert a floor on the extract so a moved anchor can't read as empty. Check SINKS against the extract only.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: The test read the whole prompt, so a sink named anywhere satisfied it.

**Fix Description**: The test extracts each prompt's enumeration between two anchors (`Sinks: `…`— pick by`; `` `SINKS` (``…`No sink fits`) with a floor of 5 named sinks on the extract, and checks SINKS against the extract only.

**Files Modified**: `shared/resources/tests/security-input-corpus.test.mjs` (+ bundled copies)

**Testing**: Mutation-proven on the develop-shaped drift: `filename` removed from the Sinks: list while still named twice elsewhere in the file → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 3) |

# Bug Report: Task 131 - The disqualified-entry check has no matching rule

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 3 review CR-2, verified)
**Date Found**: 2026-09-30

## Description

Finalise Step 3c requires `internal_reason` to begin with `path#export` and checks that entry against a table row `report-lint.js#lintReport`. It never says how the two compare. Compared literally, `shared/resources/report-lint.js#lintReport`, or a bundled `references/` copy, is not "in the table".

## Expected Behavior

An entry matches a row when its file basename and export equal the row's.

## Recommendation

State the rule beside the table and in Step 3c, and pin both in the contract test.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: The table and Step 3c named entries but not how to compare them.

**Fix Description**: The prompt states the rule beside the table (basename + export; the directory never decides) and Step 3c cites it; the row now ends after its second cell (CR-3-3), and the prompt's FAIL instruction covers the same three shapes Step 3c forces (QA-6).

**Files Modified**: `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (+ bundled copies)

**Testing**: Contract pins for the rule, the row shape (anchored `^…$`) and the FAIL scope; each mutation-proven red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 3) |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 4 (gate.4) |

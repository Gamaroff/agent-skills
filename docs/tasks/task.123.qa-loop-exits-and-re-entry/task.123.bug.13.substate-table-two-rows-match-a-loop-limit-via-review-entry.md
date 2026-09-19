# Bug Report: Task 123 - Two 5c sub-state rows match a loop-limit-via-review entry with no precedence

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 4, CR-3 — verified)
**Date Found**: 2026-09-19

## Description
The 5c sub-state table is keyed on the PR Review row. A loop-limit-via-review entry (PR Review `REQUEST CHANGES`, Action `Escalating — loop limit reached`) matches both the `REQUEST CHANGES` row ("re-enter at 5b") and the escalation row ("whatever the PR Review row says") with no stated precedence, so a mechanical reader re-runs qa-fix on an escalated run.

## Steps to Reproduce
See the QA report (`task.123.qa.4.qa-loop-exits-and-re-entry.md`, Code Review section, CR-3).

## Expected Behavior
The table has exactly one matching row for every entry: the escalation row is checked first, or the `REQUEST CHANGES` row is qualified by an Action of `Running qa-fix` / `Proceeding to 5c`.

## Actual Behavior
Two rows match; the wrong one is first.

## Impact
A resumed escalation re-enters the fix loop against a spent budget.

## Recommendation
State above the table that an `Escalating —` Action is checked first, and qualify the `REQUEST CHANGES` row the way the `not reached` row already is; extend the parity test's row parse to assert the qualification.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 4 (CR-3) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 4 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The sub-state table gained an escalation row in cycle 2 without a precedence rule over the PR-Review-keyed rows.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- The preamble states the precedence: an `**Action**` beginning `Escalating —` wins over every PR Review value; the `REQUEST CHANGES` row is qualified by an Action of `Proceeding to 5c` or `Running qa-fix`; exactly one row matches any entry. `pr-review-loop-parity` pins the precedence sentence and the qualified key.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`

**Testing**:
- parity 31/31.

**Verification Steps for QA**:
1. Build the loop-limit-via-review entry (PR Review REQUEST CHANGES, Action Escalating — loop limit reached): the preamble routes it to the escalation row; the REQUEST CHANGES row's qualifier excludes it.
| 2026-09-19 | Closed | QA | Verified in QA cycle 5: fix present on `0610f64a`, re-executed |

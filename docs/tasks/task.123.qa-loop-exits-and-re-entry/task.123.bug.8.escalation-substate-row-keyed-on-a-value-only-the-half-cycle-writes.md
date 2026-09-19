# Bug Report: Task 123 - The 5c sub-state escalation row is keyed on an Action value only the half-cycle writes

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 2 — refute pass, CR-4 — verified)
**Date Found**: 2026-09-19

## Description
Cycle 1's CR-6 fix added a 5c sub-state row keyed on `**Action**` = `Escalating — loop limit reached`, but the step doc writes that value only on the half-cycle's gate `{N+1}` when it has an open entry (Loop Escalation step 3). An ordinary loop-limit halt — the one fixture 12's own snapshot records — leaves cycle N's entry at `Running qa-fix (cycle N of N)` / `not reached`, which matches the row above ("re-enter at 5a") rather than the escalation row ("there is no cycle to re-enter"). The two rows give opposite instructions for the same `halt_reason: loop-limit` depending on whether route 2c happened to run.

## Steps to Reproduce
See the QA report (`task.123.qa.2.qa-loop-exits-and-re-entry.md`, Code Review section, CR-4) — the reproduction is in the finding.

## Expected Behavior
Every escalation path writes the same signal on the last cycle's Action row, so the table's row set matches the closed value set on every halt.

## Actual Behavior
The escalation row is unreachable on the common loop-limit path.

## Impact
A resumed loop-limit halt without a grant is told to re-enter at 5a against a spent budget.

## Recommendation
Make the Loop-limit escalation overwrite cycle N's `**Action**` with `Escalating — loop limit reached` on every path (as the Convergence trip already does for `loop not converging`), state it in the Outcome-branching post-guard paragraph, update fixture 12's snapshot report (cycle 5's Action row), and keep the escalation row keyed on the Action value.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 2 (CR-4) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 2 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The escalation sub-state row keyed on an Action value written only on the half-cycle path.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- Loop Escalation's **Loop limit** trigger now overwrites the last cycle's `**Action**` with `Escalating — loop limit reached` on **every** path — cycle N on `continue`, cycle N+1 when the half-cycle ran and its gate has an open entry — mirroring the Convergence trip. The Outcome-branching post-guard paragraph states it; the parity test pins the every-path wording.
- Fixture 12's snapshot reports (both sides) record cycle 5 as `Escalating — loop limit reached`; scenario assertion added.

**Files Modified**:
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, fixtures 12 (both sides)

**Testing**:
- parity 31/31; fixture 12 17/17 both sides.

**Verification Steps for QA**:
1. Read fixture 12's report: cycle 5's Action row is the escalation value, so the resume contract's escalation row matches it.

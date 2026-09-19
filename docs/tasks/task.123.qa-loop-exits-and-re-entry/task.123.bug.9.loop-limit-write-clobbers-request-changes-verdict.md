# Bug Report: Task 123 - The loop-limit Action write also overwrites a real REQUEST CHANGES verdict

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 3, CR-1 — verified)
**Date Found**: 2026-09-19

## Description
Cycle 2's C2-CR-4 fix made the Loop-limit escalation overwrite the last cycle's routing rows on every path — `**Action**` **and** `**PR Review**: not reached — gate did not exit the loop`. On the *loop limit via review* path (cycle N reached 5c, 5c returned REQUEST CHANGES, 5b ran, budget spent, route 2c declines with `last-cycle-not-a-fix`) that gate **did** reach 5c, and the write destroys the recorded `REQUEST CHANGES` verdict that the escalation template's own "Step 5c returned REQUEST CHANGES on cycle(s) {list}" line and the resume contract's "whatever the PR Review row says" row depend on. Same claim in the Outcome-branching preamble.

## Steps to Reproduce
See the QA report (`task.123.qa.3.qa-loop-exits-and-re-entry.md`, Code Review section, CR-1).

## Expected Behavior
The loop-limit resolution overwrites only `**Action**`; `**PR Review**` stays as written (REQUEST CHANGES, or not reached).

## Actual Behavior
Both rows are overwritten; a real verdict is lost.

## Impact
The escalation entry and the resume contract read a row the escalation just blanked.

## Recommendation
Overwrite `**Action**` only, on both the `continue` path and the half-cycle open-entry path; reword the preamble; extend the parity pin so it asserts the write names Action alone.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 3 (CR-1) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 3 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: Cycle 2's fix copied the Convergence trip's paired write (Action + PR Review) onto the loop-limit paths without noticing that one of those paths carries a real 5c verdict.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- Both loop-limit write sites now name the `**Action**` row only; the half-cycle open-entry path notes that its entry's PR Review already reads `not reached` (written when the entry was opened) and leaves it; the Outcome-branching preamble explains why the REQUEST CHANGES verdict must survive.
- `pr-review-loop-parity` pins the every-path Action write, requires the "On continue" step to say "and only that row", and forbids the paired Action + PR Review write.

**Files Modified**:
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`

**Testing**:
- parity 31/31; mutation: paired write restored → 1 red.

**Verification Steps for QA**:
1. `grep -n 'and only that row' shared/resources/develop-pipeline-step-5-6-qa-loop.md` → the On-continue step.
| 2026-09-19 | Closed | QA | Verified in QA cycle 4: fix present on `d96554cf`, re-executed |

# Bug Report: Task 123 - Stop hook's step-5 reason says 'advance the lock to 7' after any sub-skill

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, diff code review CR-3 — verified)
**Date Found**: 2026-09-19

## Description
For a step-5 lock `develop-pipeline-on-stop.sh` renders `Only once /qa-fix has actually completed: mark Step 5 ✅ in … and advance the lock to 7` (likewise for `/qa-task` and `/review-pr`) — an unconditional instruction to leave the loop after the current sub-skill — and only the appended `QA_LOOP_NOTE` sentence contradicts it. Verified by rendering the hook against a `qa_phase: 5b` lock.

## Steps to Reproduce
See the QA report (`task.123.qa.1.qa-loop-exits-and-re-entry.md`, Code Review section, CR-3) — the reproduction is in the finding.

## Expected Behavior
On a step-5 lock the completion sentence says what to do after the sub-step — write the next `qa_phase` and continue the loop — and states the 5 → 7 advance only as 5c's APPROVE/CONCERNS outcome.

## Actual Behavior
The first sentence tells an orchestrator on a 5a or 5b stall to mark Step 5 done and advance to 7, skipping 5c (or 5b and 5c) — the silent-skip failure the hook's own header says it must never cause.

## Impact
An orchestrator that follows the reason literally on a mid-loop stall finalises without a PR conformance review.

## Recommendation
Branch the completion sentence on `NEXT=5` (story/task only): 5a → 'then write qa_phase 5b or 5c per the gate and continue the loop'; 5b → 'then write qa_phase 5a and return to 5a'; 5c → 'advance the lock to 7 only on APPROVE or CONCERNS'. Add scenario-10 rows asserting the reason for 5a/5b does not contain `advance the lock to 7` as an unconditional instruction (e.g. must contain `continue the loop` and must not contain `mark Step 5 ✅`).

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 1 (CR-3) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 1 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The hook's completion sentence was generic — "mark Step N ✅ and advance to N+1" — and the step-5 arm only appended a contradicting note after it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- The story/task `case 5)` arm now sets a per-sub-step `THEN_WHAT` completion sentence: 5a → read the gate, write `qa_phase` 5b/5c via `set-qa-phase.sh`, continue the loop, lock stays at 5; 5b → commit/push, write 5a, return to 5a (or Loop Escalation at the budget), lock stays at 5; 5c → advance to 7 **only** on APPROVE/CONCERNS, REQUEST CHANGES writes 5b. The generic sentence remains for every other step and for develop-bug.
- Dead `ADVANCE_TO=7` removed. `QA_LOOP_NOTE` removed.
- Scenario 10 gains rows: 5a/5b sentences contain no "advance the lock to 7" and no "mark Step 5 ✅", say the lock stays at 5 and name the writer; 5c's conditions the advance; step 3 keeps the generic sentence.

**Files Modified**:
- `shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-on-stop.test.sh`

**Testing**:
- `develop-pipeline-on-stop.test.sh` 27/27; shellcheck clean.

**Verification Steps for QA**:
1. Render the hook against `{"skill":"develop-task","current_step":5,"qa_phase":"5b"}` → the reason's "Only once …" line says "return to 5a" and "lock stays at 5", never "advance the lock to 7".
| 2026-09-19 | Closed | QA | Verified in QA cycle 2 (refute pass): fix present on `b9c32281`, suites green |

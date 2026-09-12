# Bug Report: Task 114 - The -q/redirect snippet contradicts the prose asking the reader to see the edit

**Task**: [Link](./task.114.mutation-proving-outcomes.md)
**Bug ID**: TASK-114-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass, CR-3)
**Date Found**: 2026-09-12

## Description

Step 4 says 'Diff against the snapshot and see the edit in the output' and row 3 asks 'Does the diff against the snapshot show the edit?', but the cycle-1 snippet under them uses `diff -q … >/dev/null 2>&1`, so a reader who runs the block as written sees only a status word and cannot perform row 10's 're-read the mutation' check, which the document says only a visible diff enables.

## Steps to Reproduce

Run the step-4 block after a real mutation.

## Expected Behavior

The edit is shown, then APPLIED.

## Actual Behavior

Only APPLIED.

## Impact

A cycle-1 fix that is correct in the steady state and wrong in a transition — the class the refute pass exists for.

## Recommendation

Keep the exit-code branch; on APPLIED also run a plain `diff` so the edit is printed — in both snippets.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: cycle 1 chose `diff -q … >/dev/null` for a clean status read and lost the printed edit the prose asks the reader to re-read.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**:
- Both snippets run plain `diff` (no `-q`, no redirect) so the hunk is printed before the status word; the APPLIED message says to re-read it (row 10); the step-4 paragraph names both properties as load-bearing.

**Files Modified**: see the cycle-2 fix commit.

**Testing**: `diff` prints the hunk on the APPLIED path (verified); 4b engine re-executes the block cleanly under both shells.

## Status History

| Date       | Status       | Changed By | Notes                     |
| ---------- | ------------ | ---------- | ------------------------- |
| 2026-09-12 | New          | QA         | Found (cycle 2 refute)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started     |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented           |
| 2026-09-12 | Closed       | QA         | Verified in cycle 3       |

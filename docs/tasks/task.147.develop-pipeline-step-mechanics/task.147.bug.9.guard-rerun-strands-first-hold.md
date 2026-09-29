# Bug Report: Task 147 - A second Pre-flight Guard run overwrites the hold record and strands the first hold

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, CR-3)
**Date Found**: 2026-09-25

## Description

Every guard run creates a new HOLD_DIR and overwrites `step4-hold-dir.txt`. On a re-run the out-of-scope files are already gone, so the new directory stays empty.

**Location**: shared/resources/develop-pipeline-step-4-create-pr.md (Pre-flight Guard)

## Steps to Reproduce

Run the guard, run it again (a resume after a failed /create-pr), then run Restore.

## Expected Behavior

The held file is restored.

## Actual Behavior

Restore empties the second, empty directory and deletes the record, so the first hold stays in /tmp.

## Impact

Held files are lost on any Step 4 retry.

## Recommendation

Reuse the directory an existing record names, and add a guard, guard, restore test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: Every guard run created a fresh HOLD_DIR and overwrote the record.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The guard reuses the directory an existing record names, and the held-paths record is appended to, not replaced.

**Files Modified**: shared/resources/develop-pipeline-step-4-create-pr.md; shared/resources/tests/step-4-leak-check.test.mjs

**Testing**: New case: guard, guard (with a second file), restore. Both files come back and both are in the held record. Mutation: always creating a new directory turns it red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 2                          |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started               |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

## QA Verification

**Date**: 2026-09-25 (QA cycle 3)
**Result**: ✅ Verified fixed. The executed test runs the shipped Step 4 and Step 8 blocks one per shell, the mutation proof goes red, and the suite passes under `TMPDIR=/tmp`.

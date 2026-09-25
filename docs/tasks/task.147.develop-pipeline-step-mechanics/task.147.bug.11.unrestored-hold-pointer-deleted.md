# Bug Report: Task 147 - Step 8 deletes the only pointer to held files that were never restored

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR-3)
**Date Found**: 2026-09-25

## Description

If Restore never ran, the held paths are absent, check 5 skips them, and the passing checklist deletes step4-hold-dir.txt.

**Location**: shared/resources/develop-pipeline-step-8-commit.md

## Recommendation

Check 5 fails while step4-hold-dir.txt names a non-empty directory. Add a test that runs the guard, skips Restore, then runs Step 8.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: Step 8 check 5 fails, naming the directory, while step4-hold-dir.txt names a non-empty directory. The records are removed only after every check passes.

**Testing**: step-8: derivation and guard with no restore, then the checklist fails with "never restored" and the pointer survives. Mutation: disabling the check turns it red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 3                          |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

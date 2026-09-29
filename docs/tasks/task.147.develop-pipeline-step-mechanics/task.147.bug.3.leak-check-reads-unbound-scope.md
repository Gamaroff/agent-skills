# Bug Report: Task 147 - The Step 4 leak check reads a SCOPE_PATHS array bound in a different shell

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, CR-4)
**Date Found**: 2026-09-25

## Description

The derivation block binds `SCOPE_PATHS`. The leak check, a separate fenced block run after `/create-pr`, reads it, and each block runs in a fresh shell.

**Location**: shared/resources/develop-pipeline-step-4-create-pr.md

## Steps to Reproduce

Run the leak-check block as shipped in a repository with one in-scope commit.

## Expected Behavior

`OK`.

## Actual Behavior

`LEAK DETECTED`: with an empty array every file is out of scope, which is the obs #141 symptom the task set out to remove.

## Impact

Every run still pays for a false LEAK investigation, and the test hides it by injecting `SCOPE_PATHS`.

## Recommendation

Persist the derived array to a state file in the derivation block, read it back in the guard and the leak check, and have the test run the leak block with no injected array.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: Each fenced block runs in its own shell, and the array the derivation block binds does not survive into the leak check.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The derivation block writes `.claude/state/step4-scope-paths.txt`. The Pre-flight Guard and the leak check read it back and refuse when it is missing. While there, qa-fix's adversarial pass found the same shape in `HOLD_DIR`: the Restore block read it from another shell and would have stranded held files in /tmp. It is now recorded in `.claude/state/step4-hold-dir.txt`.

**Files Modified**: shared/resources/develop-pipeline-step-4-create-pr.md; shared/resources/tests/step-4-leak-check.test.mjs; shared/resources/tests/lib/executed-prose.mjs (fixture gitignores .claude/)

**Testing**: The leak test runs the derivation block and the leak check as separate shells with nothing injected. There are new cases for a missing scope file and for guard → restore across shells. Mutations: removing the scope-file read turns the three OK/LEAK cases red; removing the hold-dir read turns the restore case red.

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 1                              |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started                   |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved     |

## QA Verification

**Date**: 2026-09-25 (QA cycle 2)
**Result**: ✅ Verified fixed. The cycle-1 reproduction was re-run against `f4dee2d2`, the new test runs the shipped block with nothing injected, and the mutation proof is recorded. CI is 5/5 green.

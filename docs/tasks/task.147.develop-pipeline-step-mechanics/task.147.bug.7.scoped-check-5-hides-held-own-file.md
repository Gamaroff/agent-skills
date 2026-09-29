# Bug Report: Task 147 - Scoped Step 8 check 5 reports a held-and-restored own file as pushed

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-7
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, CR-1)
**Date Found**: 2026-09-25

## Description

Two changes that are each correct alone combine here. Step 4 derives scope from tracked changes, so the Pre-flight Guard holds a new untracked file that sits in a directory with no tracked edit, and Restore later puts it back, still untracked. Step 8 stages only the work item, and the scoped check 5 classifies that file as another session's dirt.

**Location**: shared/resources/develop-pipeline-step-8-commit.md (check 5), shared/resources/develop-pipeline-step-4-create-pr.md (Pre-flight Guard)

## Steps to Reproduce

The run creates `newdir/x.test.mjs` (no tracked change in `newdir/`), then runs Step 4 (held, restored) and Step 8.

## Expected Behavior

Check 5 fails and names `newdir/x.test.mjs`: the run's own file is not on the remote.

## Actual Behavior

Check 5 prints `! outside scope (warning): newdir/x.test.mjs`, exits 0, and the checklist reports the work pushed.

## Impact

verify-push-state exists to catch exactly this false claim ("reported work actually exists on the remote"), and before this change set the unscoped check did catch it.

## Recommendation

The guard records each held path in `.claude/state/step4-held-paths.txt`, and Step 8 adds them to `SCOPE_ARGS`, so a held path still uncommitted at Step 8 fails the step and is named.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: Step 4's guard holds a new untracked file of the run's own when it sits in a directory with no tracked change, and scoped check 5 then read the restored file as another session's dirt.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The guard records every held path in `.claude/state/step4-held-paths.txt` (first line = work item; appended, never truncated). Step 8 check 5 adds each recorded path that still exists as a scope, so one still uncommitted fails the step by name. The step-8 table states the trade: another session's held file now fails loudly too.

**Files Modified**: shared/resources/develop-pipeline-step-4-create-pr.md; shared/resources/develop-pipeline-step-8-commit.md; shared/resources/tests/step-8-completion-checklist.test.mjs

**Testing**: New case: Step 4's derivation, guard and restore blocks run in three shells, then the checklist fails naming `newdir/own.test.mjs`. Mutation: dropping the held-path scopes turns it red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 2                          |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started               |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

## QA Verification

**Date**: 2026-09-25 (QA cycle 3)
**Result**: ✅ Verified fixed. The executed test runs the shipped Step 4 and Step 8 blocks one per shell, the mutation proof goes red, and the suite passes under `TMPDIR=/tmp`.

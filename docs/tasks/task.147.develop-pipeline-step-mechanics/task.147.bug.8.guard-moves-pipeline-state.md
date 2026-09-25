# Bug Report: Task 147 - The Pre-flight Guard moves .claude/state when .claude/ is not gitignored

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, CR-2)
**Date Found**: 2026-09-25

## Description

The guard holds every untracked path outside the scope. In a repo that does not ignore `.claude/`, that includes `.claude/`: the pipeline's own lock, and the scope and hold records the guard itself just wrote.

**Location**: shared/resources/develop-pipeline-step-4-create-pr.md (Pre-flight Guard)

## Steps to Reproduce

Fixture without `.claude/` in `.gitignore`: run the derivation block, then the guard.

## Expected Behavior

`.claude/` is left in place.

## Actual Behavior

`.claude/` moves into HOLD_DIR, and the later blocks find no scope file or hold record.

## Impact

/create-pr and the leak check exit 1, and the held files are stranded.

## Recommendation

Skip `.claude/` explicitly in the guard, and test it on a fixture with no `.gitignore` entry for it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The guard held every untracked out-of-scope path, including `.claude/` where it is not ignored.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The guard skips `.claude` and `.claude/*`.

**Files Modified**: shared/resources/develop-pipeline-step-4-create-pr.md; shared/resources/tests/step-4-leak-check.test.mjs

**Testing**: New case: a fixture whose `.gitignore` does not name `.claude/`. After the guard runs, the scope record is still in place and the leak check reads it. Mutation: removing the skip turns it red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 2                          |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started               |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

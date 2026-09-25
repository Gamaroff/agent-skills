# Bug Report: Task 147 - Scoped Step 8 staging leaves a develop-bug general-bug registry close uncommitted

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 1, CR-2)
**Date Found**: 2026-09-25

## Description

develop-bug Step 7 B3 flips the `docs/bugs/bug-registry.md` row to closed and says the edit "is committed atomically with the bug file in Step 8". Step 8 runs `/commit-changes --scope {bug-directory}`, and only the removed whole-tree `git add -u` ever reached a file outside that directory.

**Location**: shared/resources/develop-pipeline-step-8-commit.md; skills/develop-bug (Step 7 B3, Step 8)

## Steps to Reproduce

Run develop-bug on a general bug to Step 8 with this branch installed.

## Expected Behavior

The registry row edit is committed in the close commit.

## Actual Behavior

The registry edit stays in the working tree, and scoped Step 8 check 5 reports it as `! outside scope (warning)` and passes.

## Impact

The consumer drift guard compares the registry row to the bug file on every push (develop-bug SKILL.md), so the lost edit is a red guard on the next push, and the close is not recorded.

## Recommendation

Pass `--scope docs/bugs/bug-registry.md` in general-bug mode, both to /commit-changes and to the check-5 scope list. State in the step-8 doc which callers write outside their work-item dir, and hold it with a test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: Step 8 relied on a whole-tree `git add -u` to carry writes outside the work item. Scoping it removed that implicit carriage, and develop-bug's general-bug registry close depended on it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: Step 8 now takes `{extra-scope-paths}`, documented as a table of caller → paths → writer. It is passed both to `/commit-changes` and to check 5 (`EXTRA_SCOPES` → `SCOPE_ARGS`). develop-bug's SKILL.md Step 8 names `docs/bugs/bug-registry.md` for a general bug, and Step 7 B3 says the registry travels as that extra scope.

**Files Modified**: shared/resources/develop-pipeline-step-8-commit.md; skills/develop-bug/SKILL.md; skills/develop-bug/references/develop-bug-step-7-close-bug.md; shared/resources/tests/step-8-completion-checklist.test.mjs

**Testing**: New case: an uncommitted registry edit fails check 5 when named as an extra scope, and passes as a warning when not (which shows the regression). Mutation: dropping the `EXTRA_SCOPES` loop turns it red.

## Status History

| Date       | Status       | Changed By | Notes                                   |
| ---------- | ------------ | ---------- | --------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 1                              |
| 2026-09-25 | In Progress  | qa-fix     | Investigation started                   |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved     |

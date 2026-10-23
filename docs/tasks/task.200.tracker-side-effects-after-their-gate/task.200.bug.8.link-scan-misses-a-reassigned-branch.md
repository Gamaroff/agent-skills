# Bug Report: Task 200 - The link scan accepts a branch variable that is later reassigned from HEAD

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2, refute pass)
**Date Found**: 2026-10-20

## Description

Cycle 1 widened `tests/doc-link-branch-population.test.js` to answer TASK-200-004, which asked for a link built from the branch "any other way" to be caught. `unresolvedLinks` collects the names of variables that any line calling `doc-link-branch.js` assigns, and accepts a `blob/${V}` link when V is in that set. A second assignment of V from the checked-out branch, on another line, is not looked at.

QA cycle 2 mutation: adding `DOC_BRANCH=$(git branch --show-current)` between the guard and `DOC_URL=` in `skills/sync-github-task/SKILL.md` turned no test red (`no-red-untested`). The link scan passes because DOC_BRANCH is assigned by a resolver call elsewhere in the file. The execute test passes because it runs only the binding, the call and the guard.

## Steps to Reproduce

1. In a scratch worktree, insert `DOC_BRANCH=$(git branch --show-current)` on the line before `DOC_URL=` in `skills/sync-github-task/SKILL.md`.
2. Run `command node --test tests/doc-link-branch-population.test.js tests/doc-link-branch-sites-execute.test.js`: all pass.

## Expected Behavior

Every assignment of a link's branch variable is a resolver call or allowlisted, so a reassignment from HEAD fails the scan.

## Actual Behavior

One resolver assignment of the name covers every other assignment of it in the file.

## Impact

The one-resolver rule can regress at any site without CI noticing.

## Recommendation

In `unresolvedLinks`, flag a link when any line assigns its variable without calling `doc-link-branch.js`, and add the reassignment shape to the control test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 2)

**Root Cause Analysis**: `unresolvedLinks` accepted a link variable if any line calling `doc-link-branch.js` assigned it, so one resolver assignment vouched for every other assignment of the same name.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: A link variable is resolved only when it is assigned at least once and every assignment of it in the file calls `doc-link-branch.js`. The control test gained the reassigned shape.

**Files Modified**:

- `tests/doc-link-branch-population.test.js`

**Testing**: Mutation: QA cycle 2's own `DOC_BRANCH=$(git branch --show-current)` before `DOC_URL=` in sync-github-task, which was `no-red-untested`, now turns the link scan red.

**Verification Steps for QA**:

1. `command node --test tests/doc-link-branch-population.test.js`: all pass.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 2 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 2) |
| 2026-10-20 | Closed | qa-task | Verified by task.200.qa.3.tracker-side-effects-after-their-gate.md |

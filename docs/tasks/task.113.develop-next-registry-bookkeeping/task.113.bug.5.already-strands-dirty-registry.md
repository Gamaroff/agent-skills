# Bug Report: Task 113 - Step 4's `already` branch strands an uncommitted registry edit after a crash between the write and the commit

**Task**: [Link](./task.113.develop-next-registry-bookkeeping.md)
**Bug ID**: TASK-113-BUG-5
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 3b refute pass, cycle 2 — CR-1)
**Date Found**: 2026-09-12

## Description

The registry arm says: `already` → "log it, skip the commit, mark `ticked: true`". A crash **between**
the annotate write and the `git commit` leaves the row edited on disk; the resume path
(`merged: true, ticked: false` → Step 4, which skips Step 0's dirty-tree check) re-runs the
annotate, gets `already` (the row already names the PR), skips the commit, marks `ticked: true`,
and Step 5 deletes the run state. The next run's Step 0 then HALTs on a dirty working tree with
nothing pointing back at the cause.

## Expected Behavior

`already` is idempotent on the *row*, not on the *commit*: before marking `ticked: true`, check
whether the registry is dirty and commit/push it if so.

## Actual Behavior

The edited registry is stranded uncommitted; the following run halts on it.

## Impact

One crash in a narrow window produces a halt on the next run with a misleading message; the same
shape exists in `develop-batch`'s lane.

## Recommendation

On `already` (and on any exit-0 reason where the row may already be edited):
`git diff --quiet -- docs/tasks/task-registry.md || { git add …; git commit …; git push …; }`
then `ticked: true`. Mirror in develop-batch. Shape-assert the dirty check on the `already` branch.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: `already` was treated as "nothing to do" — idempotent on the row, but the commit is a separate step the crash window can split off.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**: the `already` branch in `develop-next` Step 4 now runs `git diff --quiet -- docs/tasks/task-registry.md || { git add …; git commit …; git push …; }` before marking `ticked: true`; `develop-batch`'s lane mirrors it; every other exit-0 reason is enumerated (`no-row`, `no-registry`, `no-cell`, `not-accepted`, `not-a-task`, `engine-unavailable`).

**Files Modified**: skills/develop-next/SKILL.md · skills/develop-batch/SKILL.md · evals/develop-next + develop-batch skill-shape suites

**Testing**: shape assertions on the dirty check in both suites; mutation (replace the diff with `true` / `git status`) reds each by name.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Filed (QA cycle 2)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |

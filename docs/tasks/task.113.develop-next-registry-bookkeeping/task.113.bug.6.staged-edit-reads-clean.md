# Bug Report: Task 113 - the QA-7 dirty check compares worktree to index, so a staged-but-uncommitted registry edit reads clean

**Task**: [Link](./task.113.develop-next-registry-bookkeeping.md)
**Bug ID**: TASK-113-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (Step 3b, cycle 3 — CR-1)
**Date Found**: 2026-09-12

## Description

Bug 5's fix added `git diff --quiet -- docs/tasks/task-registry.md || { git add …; git commit …; git push …; }` on the `already` branch. `git diff` without `HEAD` compares the **working tree to the index**: a crash after `git add` and before `git commit` leaves the edit staged, the check reads clean, `ticked: true` is written, and the edit is never committed — the second half of the same crash window. Mirrored in `develop-batch`.

Verified in a scratch clone: stage an edit → `git diff --quiet -- <file>` exits 0; `git diff --quiet HEAD -- <file>` exits 1.

## Expected Behavior

Any uncommitted change to the registry — staged or not — triggers the commit.

## Actual Behavior

A staged edit is treated as clean.

## Recommendation

`git diff --quiet HEAD -- docs/tasks/task-registry.md` in both skills; update the two pinned shape regexes; a fixture-style check is not possible for prose, so mutation-prove by reverting to the index form.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Root Cause**: `git diff --quiet -- <path>` diffs the working tree against the index; a staged edit is invisible to it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Fix Description**: `git diff --quiet HEAD -- docs/tasks/task-registry.md` in both orchestrators, with the prose naming the staged half of the window; the two pinned shape regexes re-pinned to the `HEAD` form.

**Files Modified**: skills/develop-next/SKILL.md · skills/develop-batch/SKILL.md · both shape suites

**Testing**: snippet executed in a scratch clone with a *staged* edit under bash and zsh → commit lands, tree clean against HEAD; mutation (drop `HEAD`) reds both suites by name.

## Status History

| Date       | Status       | Changed By | Notes                 |
| ---------- | ------------ | ---------- | --------------------- |
| 2026-09-12 | New          | QA         | Filed (QA cycle 3)    |
| 2026-09-12 | In Progress  | qa-fix     | Investigation started |
| 2026-09-12 | Ready for QA | qa-fix     | Fix implemented       |
| 2026-09-12 | Closed       | QA         | Verified with a staged edit in a scratch clone under bash + zsh (QA cycle 4) |

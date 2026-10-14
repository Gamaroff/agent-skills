# Bug Report: Task 208 - Step 0.3a tells later steps to use $ROOT, which only exists inside its block

**Task**: [Link](./task.208.worktree-root-config.md)
**Bug ID**: TASK-208-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (cycle 3)
**Date Found**: 2026-10-14

## Description

`skills/develop-batch/SKILL.md:204` says "Use the printed `$ROOT`, not the raw config value, everywhere below". `$ROOT` is a shell variable in the Step 0.3a block; every later step (0.4's stale match, Step 1's `--worktree-root`, the `.gitignore` advice) still uses the `<worktreeRoot>` placeholder. An agent that follows the sentence passes an unbound, empty `$ROOT` to Step 1.

## Expected Behavior

One binding the later steps can use: the printed value replaces `<worktreeRoot>` from here on.

## Recommendation

Say that the printed value is the `<worktreeRoot>` substituted in every later step.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 3 scoped review — introduced by the cycle-2 fix |

# Bug Report: Task 208 - Step 0.3a tells later steps to use $ROOT, which only exists inside its block

**Task**: [Link](./task.208.worktree-root-config.md)
**Bug ID**: TASK-208-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ⚠️ Reopened
**Found By**: QA Engineer (cycle 3)
**Date Found**: 2026-10-14

## Description

`skills/develop-batch/SKILL.md:204` says "Use the printed `$ROOT`, not the raw config value, everywhere below". `$ROOT` is a shell variable in the Step 0.3a block; every later step (0.4's stale match, Step 1's `--worktree-root`, the `.gitignore` advice) still uses the `<worktreeRoot>` placeholder. An agent that follows the sentence passes an unbound, empty `$ROOT` to Step 1.

## Expected Behavior

One binding the later steps can use: the printed value replaces `<worktreeRoot>` from here on.

## Recommendation

Say that the printed value is the `<worktreeRoot>` substituted in every later step.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-14

**Root Cause**: the cycle-2 fix named a shell variable in prose that later steps read as a placeholder.

**Fix**: Step 0.3a now says every later `<worktreeRoot>` means the value the block printed, to be
substituted into each step, and that `$ROOT` exists only inside the block. Doc-only; no test asserts
prose wording. Probe: no other executed document restates the old sentence (population 1, the
SKILL itself).

**Files Modified**: `skills/develop-batch/SKILL.md`; the timing-test comment in
`shared/resources/tests/qa-execute-snippets.test.mjs` (cycle-3 CR-3).

### Iteration 2

**Date**: 2026-10-14

**QA Reopening Reason**: the iteration-1 sentence pointed later steps at "the value this block
printed", but the block captured the root into `$ROOT` and printed nothing on success.

**Fix**: the block now ends with `echo "worktreeRoot: $ROOT"`, and the prose names that line as the
value later steps substitute. The executed-block test asserts `worktreeRoot: .worktrees` on stdout;
removing the echo turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 3 scoped review — introduced by the cycle-2 fix |
| 2026-10-14 | In Progress | qa-fix | Root cause found |
| 2026-10-14 | Ready for QA | qa-fix | Doc fix: later steps substitute the printed root |
| 2026-10-14 | Reopened | qa-task | Not fixed by task.208.qa.4.worktree-root-config.md — the block prints nothing, so 'the value this block printed' does not exist |
| 2026-10-14 | In Progress | qa-fix | Iteration 2 |
| 2026-10-14 | Ready for QA | qa-fix | Block prints the normalised root; test asserts it |

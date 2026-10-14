# Bug Report: Task 208 - develop-batch writes the exclude line before the root is validated

**Task**: [Link](./task.208.worktree-root-config.md)
**Bug ID**: TASK-208-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-10-14

## Description

`develop-batch` Step 0.3a (`skills/develop-batch/SKILL.md:188-189`) runs before the selector, which is
where the root is validated (Step 1). Two consequences:

1. It writes the raw config value into `.git/info/exclude`. A root with a newline adds extra exclude
   patterns; a `..` or symlinked root is refused only afterwards, and each retry appends another line.
2. `git check-ignore -q "<root>/" || printf … >> exclude` treats every non-zero exit as "not ignored".
   Exit 128 means git could not answer (for example `'../x/' is outside repository`), and the step then
   writes a junk pattern and reports the root as ignored.

## Expected Behavior

The root is validated first. The exclude line is written from the normalised root, and only when
`git check-ignore` exits 1. Any other status halts with git's message.

## Actual Behavior

Validation runs after the only side effect it was meant to stop, and exit 128 reads as "not ignored".

## Recommendation

A selector `--check-root <root>` mode that prints the normalised root or exits 1, called at the top of
Step 0.3a; then branch on `git check-ignore`'s exit status explicitly.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-14

**Root Cause**: the root was validated only inside the Step 1 selector call, and Step 0.3a, which
runs first and writes a file, trusted the raw config value. Its `||` collapsed git's three answers
(ignored, not ignored, could not answer) into two.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-14

**Fix Description**:

- New selector mode `select-next.mjs --check-root <root>`: prints the normalised root, or exits 1
  (absolute, `..`, control character, symlink out). No roadmap is read.
- Step 0.3a calls it first and HALTs on a refusal, then branches on `git check-ignore`: 0 nothing,
  1 append the normalised root, anything else HALT. Later steps use the printed `$ROOT`.
- QA-208-5: `isLinkedWorktree` reads the `gitdir:` line with `indexOf`/`trim`, no regex.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs`, `skills/develop-batch/SKILL.md`
- `shared/resources/qa-execute-snippets.mjs` (+ bundled copies)
- `evals/develop-next/unit/select-next.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs`,
  `shared/resources/tests/qa-execute-snippets.test.mjs`

**Testing**:

- Step 0.3a's bash block is now **executed** by three protocol tests in throwaway repos: an unignored
  root is excluded once by its normalised name; `../outside`, a symlink out and a root with a newline
  HALT with nothing written; outside a repository (git exit 128) it HALTs.
- `13b: --check-root prints the normalised root, or refuses with exit 1`.
- `QA-18b: isLinkedWorktree reads a whitespace-heavy .git file in linear time`.
- Mutation-proved: writing before validating, reading 128 as not-ignored, dropping the symlink check
  from `--check-root`, and restoring the old regex each turn a test red (the regex case by timing out).

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 2 refute pass, CR-1 and CR-2 |
| 2026-10-14 | In Progress | qa-fix | Root cause: validation ran after the step that writes |
| 2026-10-14 | Ready for QA | qa-fix | --check-root first; check-ignore exit status read three ways |
| 2026-10-14 | Closed | qa-task | Verified by task.208.qa.3.worktree-root-config.md |

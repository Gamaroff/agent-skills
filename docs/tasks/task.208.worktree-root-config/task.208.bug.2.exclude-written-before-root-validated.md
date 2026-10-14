# Bug Report: Task 208 - develop-batch writes the exclude line before the root is validated

**Task**: [Link](./task.208.worktree-root-config.md)
**Bug ID**: TASK-208-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
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

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 2 refute pass, CR-1 and CR-2 |

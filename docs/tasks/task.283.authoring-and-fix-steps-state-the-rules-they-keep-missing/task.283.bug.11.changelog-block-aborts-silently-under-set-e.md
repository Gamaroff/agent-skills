# Bug Report: Task 283 - CHANGELOG block aborts silently under set -e on an empty region

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (code-review CR-1, reproduced; CR-2, CR-3 and CR-4 folded in)
**Date Found**: 2026-11-20

## Description
The bullet counts use `grep -c .`, which prints 0 but exits 1 when the region holds no bullets. A caller running under `set -e` then loses the shell on that line with no output. A valid edit that touches only `[Unreleased]`, against a base whose released region has no bullets, exits 1 silently.

Folded in: a failed `git show` inside the pipe is not detected (no pipefail; `git cat-file -e` has already confirmed the object, so this is unlikely); `awk -v` processes backslash escapes, so the added-bullet list in the HALT message can be wrong (count and decision stay right); the release-cut test asserts only the exit code.

## Steps to Reproduce
Base: a `## [Unreleased]` bullet and a released section with prose only. Edit: add a bullet under `## [Unreleased]`. Run the block with `set -e` first.

## Expected Behavior
Exit 0, as without `set -e`.

## Actual Behavior
Exit 1, no output (bash and zsh).

## Impact
A false HALT with no message, only for callers that run the block under `set -e` against a changelog with no bullets in its released region.

## Recommendation
Count with `awk 'END{print NR}'` or append `|| true`; read the base into a variable before awk; pass it through `ENVIRON`; assert the HALT text in the release-cut test; add a `set -e` case with an empty released region; mutation-prove.

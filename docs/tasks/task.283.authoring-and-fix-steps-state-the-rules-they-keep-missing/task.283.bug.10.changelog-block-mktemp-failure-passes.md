# Bug Report: Task 283 - CHANGELOG block reads a failed mktemp as a pass

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-10
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (code-review CR-1, reproduced; CR-2, CR-3 and CR-4 folded in)
**Date Found**: 2026-11-20

## Description
The rewritten block holds the two bullet lists in temp files made with `mktemp`. When `mktemp` fails (an unusable `TMPDIR`), both variables are empty, the redirects and the numeric test only print errors, and the block exits 0 on a branch with a misplaced bullet.

## Steps to Reproduce
Run the block in a scratch repo with a misplaced bullet and `TMPDIR=/nonexistent/dir`.

## Expected Behavior
Exit 1 with the HALT, as the control does.

## Actual Behavior
Exit 0 after printing a `mktemp` error.

## Impact
"Could not look" reads as a pass, the same class as bug 5.

## Developer Fix Cycle (qa-fix cycle 4)

No temp files: both bullet lists are held in variables, and a failed read HALTs. The diff exit code is captured as `DIFF_RC=0; git diff --quiet … || DIFF_RC=$?`, which survives `set -e`. The no-merge-base HALT names the shallow-clone remedy, and the closing prose now separates the two kinds of HALT. Five new tests per shell: bad TMPDIR, `set -e`, shallow or unrelated history, release cut (HALT, stated limit), offsetting removal (passes, stated limit). Mutation proofs: the previous block fails three of them; the old `DIFF_RC=$?` form fails the `set -e` test; changing the remedy text fails the shallow test.

## Recommendation
Hold the lists in variables; HALT on a failed read; capture the diff exit code safely; name the remedy; test each.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | Closed | qa-task | Verified by task.283.qa.5 |

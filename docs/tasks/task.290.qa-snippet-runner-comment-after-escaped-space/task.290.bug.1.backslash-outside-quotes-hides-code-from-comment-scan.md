# Bug Report: Task 290 - A backslash outside quotes still lets the comment scan hide code

**Task**: [Link](./task.290.qa-snippet-runner-comment-after-escaped-space.md)
**Bug ID**: TASK-290-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

`stripCommentQuoteAware` reads a backslash only inside double quotes. Outside quotes, bash treats `\'`, `\"` and a backslash-newline as literals or line joins, but the scan opens a quote or sees a fresh line. The scan then strips real code as a comment, and the block classifies `runnable`. The task listed "Handle a backslash outside quotes in `stripNonCode`" in scope. It was dropped because a plain skip of the next character made one documentation block newly runnable.

## Steps to Reproduce

From the repository root, with the engine at `shared/resources/qa-execute-snippets.mjs`:

1. `classifyBlock("echo \\'a' # ; touch out' ; touch out2")` returns `runnable`. In a fresh directory, `bash -c "echo \\'a' # ; touch out' ; touch out2"` creates `out2`.
2. `classifyBlock("echo a\\\n# ; touch out")` returns `runnable`. Under bash the backslash-newline joins the lines, `a#` is mid-word, and `touch out` runs and creates `out`.

Control: `echo a # ; touch out` classifies `runnable` and creates nothing (a real comment). Both reproductions give the same answer on `develop`.

## Expected Behavior

Both blocks classify `mutating`.

## Actual Behavior

Both classify `runnable` and write under real bash.

## Impact

QA would execute a block that writes outside the temp copy's intent. The task's own Problem 1 is this class. The differential test has no escaped-quote or continuation context, so it passes over both.

## Recommendation

Fail closed: when the scan meets a backslash outside quotes followed by a quote character or a newline, classify the block `mutating` (unparseable) instead of skipping. Add both reproductions as gap rows, add the two contexts to the differential generator, and re-run the docs scan against `develop`: 0 newly runnable, and list any newly refused block.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-11-09 | New | qa-task | Found in QA cycle 1 |
| 2026-11-09 | Ready for QA | qa-fix | Fixed in cycle 1 |

## Developer Fix Cycle

### Iteration 1

**Root cause**: `stripCommentQuoteAware` read a backslash only inside double quotes, and `stripProse` scanned lines one at a time, so an escaped quote opened a quote bash did not open and a backslash-newline hid a joined `#`.

**Fix**: refuse both shapes (fail closed) instead of skipping the escaped character. A backslash before a quote outside quotes throws in the stripper; a line ending in an odd run of backslashes followed by a line starting with `#` throws in `stripProse`. `classifyFailClosed` turns the throw into a `mutating` verdict.

**Files**: `shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`, bundled copies.

**Testing**: three gap rows, three controls, five differential contexts. Mutation proof: removing either throw turns its gap row and the differential test red. Docs scan against develop: 3442 blocks, 0 newly runnable, 0 newly refused. `CI=true npm run ci:fast` green.

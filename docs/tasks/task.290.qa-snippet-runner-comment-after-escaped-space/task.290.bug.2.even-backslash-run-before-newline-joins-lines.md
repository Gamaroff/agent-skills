# Bug Report: Task 290 - An even run of backslashes before a newline is joined as a continuation

**Task**: [Link](./task.290.qa-snippet-runner-comment-after-escaped-space.md)
**Bug ID**: TASK-290-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

`commandInvocations` joins continuation lines with a replace of a backslash followed by a newline. That matches the last backslash of any run. An even run is an escaped backslash followed by a real newline, so bash ends the command there; the scan joins the next line into the first command's arguments and never reads it as a command.

## Steps to Reproduce

1. `classifyBlock("echo a\\\\\ntouch out")` (the text `echo a\\`, a newline, `touch out`) returns `runnable`.
2. In a fresh directory, `bash -c` on the same text creates `out`.

Control: `echo a\` + newline + `b` (an odd run, a real continuation) is one command and stays `runnable`.

A random-combination probe (40000 blocks, a writer on the next line, run under real bash) found 165 writes. Every one was an even run before a newline. Identical on `develop`.

## Expected Behavior

`mutating`.

## Actual Behavior

`runnable`, and bash writes.

## Impact

A block that writes classifies runnable; QA would execute it.

## Recommendation

Join only an odd run, for example `.replace(/(?<!\\)((?:\\\\)*)\\\n/g, "$1 ")`. Add gap rows for two and four backslashes, a control for the odd continuation, and differential contexts. Re-run the docs scan.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-11-09 | New | qa-task | Found in QA cycle 2 |
| 2026-11-09 | Ready for QA | qa-fix | Fixed in cycle 2 |
| 2026-11-09 | Closed | qa-task | Verified by task.290.qa.3.qa-snippet-runner-comment-after-escaped-space.md |

## Developer Fix Cycle

### Iteration 1

**Root cause**: `commandInvocations` replaced every backslash-newline with a space, so the last backslash of an even run joined the next line.

**Fix**: the join matches only an odd run (`/(?<!\\)((?:\\\\)*)\\\n/g`, the same form the later prose pass already used). Files: `shared/resources/qa-execute-snippets.mjs`, its test, `qa-runnable-prose-detection.md`, `CHANGELOG.md`, bundled copies.

**Testing**: three gap rows, two controls, five differential contexts. Reverting the regex turns two gap rows and the differential test red. Random probe 40000 blocks vs bash: 0 writes (was 165). Docs scan vs develop: 3443 blocks, 0 newly runnable, 0 newly refused. `CI=true npm run ci:fast` green (8290 tests).

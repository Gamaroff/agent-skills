# Bug Report: Task 290 - A comment start accepts CR, FF, VT and Unicode spaces that bash does not

**Task**: [Link](./task.290.qa-snippet-runner-comment-after-escaped-space.md)
**Bug ID**: TASK-290-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

`startsComment` tests the character before a `#` with `/[\s;&|(]/`. In JavaScript `\s` matches CR, form feed, vertical tab, NBSP and U+2028 as well as space and tab. Bash separates words only at space, tab and newline (and the operators), so a `#` after CR, FF, VT or a Unicode space is mid-word, not a comment.

## Steps to Reproduce

1. `classifyBlock("echo a\r# ; touch out")` returns `runnable`; `bash -c` on it creates `out`. The same for form feed, vertical tab, U+00A0 and U+2028.
2. Control: a space or a tab before the `#` is a real comment, classifies `runnable` and writes nothing.

Identical on `develop` (the old line scan used `\s`).

## Expected Behavior

`mutating` (or at least not `runnable`) for the CR, FF, VT and Unicode-space forms.

## Actual Behavior

`runnable`, and bash writes.

## Impact

A block that writes classifies runnable.

## Recommendation

Use the blanks bash uses, for example `/[ \t\n;&|(]/`. Add gap rows for the five characters, keep the space and tab controls, add differential contexts, re-run the docs scan.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-11-09 | New | qa-task | Found in QA cycle 3 |

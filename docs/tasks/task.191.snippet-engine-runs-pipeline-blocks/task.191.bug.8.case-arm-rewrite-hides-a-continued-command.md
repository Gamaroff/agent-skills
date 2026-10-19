# Bug Report: Task 191 - The case-arm rewrite in helper mode hides a command that continues a multi-line substitution

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-8
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 2, CR2-4)
**Date Found**: 2026-10-19

## Description

`prepareHelperText` rewrites any line inside a `case … in` that looks like `a|b)` into `_)` before the scan. That line can instead close a multi-line `$(` or subshell opened on the line before, so a command on it is rewritten away and never scanned.

## Steps to Reproduce

Fixture `h/case.sh` = `case "$1" in` / `  *) y=$(true` / `x|touch${IFS}pwned)` / `  ;;` / `esac`. `classifyBlock("bash h/case.sh x", {}, {helperRoot})` → `runnable`; bash runs the `x|touch …` pipeline.

## Expected Behavior

An arm pattern is rewritten only on a line that directly follows `case … in` or an arm terminator (`;;`, `;&`, `;;&`), and never while a `$(`, `(` or backtick from an earlier line is open.

## Actual Behavior

Classified runnable; the hidden pipeline runs.

## Impact

Helper mode, which exists to read helper syntax a block does not have, hides an arbitrary command.

## Recommendation

Narrow the rewrite to real arm-pattern positions, and leave any other line to the fail-closed scan; control test with the fixture above.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: Helper mode rewrote any line shaped like a multi-line `case` arm pattern while inside a `case`, including the tail of a multi-line `$(` whose `x|cmd)` line is a pipeline.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: A line is rewritten only at an arm position: right after `case … in` or after an arm terminator (`;;`, `;&`, `;;&`), skipping blanks and comments.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR2-4: a case-arm-shaped line that is not at an arm position keeps its command` — the reported fixture refused, a real two-arm `case` still runnable. Mutation: rewriting at every line inside a `case` turns it red. The real `qa-cycle.sh` stays runnable.

**Verification Steps for QA**: `bash h/case.sh x` (the bug's fixture) is `mutating`.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 2 |
| 2026-10-19 | In Progress | qa-fix | Investigation started (QA cycle 2) |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven (QA cycle 2) |
| 2026-10-19 | Closed | qa-task | Verified by task.191.qa.3.snippet-engine-runs-pipeline-blocks.md |

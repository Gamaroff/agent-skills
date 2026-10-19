# Bug Report: Task 191 - Arguments passed to a sourced helper's function are never scanned

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, CR-1)
**Date Found**: 2026-10-19

## Description

A call to a function a sourced helper defines is admitted by name alone. `newest-numbered.sh` forwards its arguments to `find`, so `newest_numbered docs dod -delete` runs `find … -delete`, while `find docs -delete` written directly is refused.

## Steps to Reproduce

`classifyBlock("source shared/resources/newest-numbered.sh || exit 1\nnewest_numbered docs dod -delete", {}, {helperRoot: <repo>})` → `runnable`.

## Expected Behavior

Refused: a function call is only as permissive as the commands it forwards its arguments to.

## Actual Behavior

Classified runnable.

## Impact

A shipped, admitted helper turns into a write primitive.

## Recommendation

Refuse a call to a sourced function whose body forwards `$@` / a positional parameter to a command with argument-dependent deny rules (find, sed, git), or scan the call's arguments with those rules. Control test with this exact block.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: A sourced function was trusted as a known word, but its arguments were never scanned: `newest_numbered docs dod -delete` forwards `-delete` to `find`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: Each line that calls a helper-defined function is re-read with the function name replaced by each command the helper runs, closed over functions that call other helpers' functions, with continuation lines joined. A deny rule that fires refuses the block: `function newest_numbered forwards its arguments to find: deny-list: find write action`.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR-1: a sourced function's arguments are checked …` and `… a continued call line and a call through a second helper's function are both checked`. Mutation: removing the check, the continuation join or the transitive closure each turns a test red.

**Verification Steps for QA**: `source shared/resources/newest-numbered.sh || exit 1` + `newest_numbered docs dod -delete` → mutating; the documented `next_numbered … -name "…"` shape stays runnable. Residual, pre-existing: the deny-list misses a quoted option (`find docs "-delete"` is runnable on develop too); the check is as strong as that list and no stronger.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

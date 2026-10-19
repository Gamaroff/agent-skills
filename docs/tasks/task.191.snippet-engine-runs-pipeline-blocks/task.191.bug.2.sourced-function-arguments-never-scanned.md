# Bug Report: Task 191 - Arguments passed to a sourced helper's function are never scanned

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
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

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: The forwarding check found the call by matching the function name as literal text in the prose, while the scan that admits the call unquotes the name first, so a respelled name was admitted and never checked.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: The check reads the scan's own invocations: the command word is the unquoted one, and the arguments come from a second reading of the same text that keeps each quoted span as written (`rawInvocations`, which must line up one-to-one with the scan or the call is refused). Each argument list is judged as written and again unquoted, so `"-delete"` and `-dele\te` are `-delete`.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR2-1: a respelled function name, and a quoted argument, are the same call` — two respellings, four quoted forms, the documented shape runnable. Mutations: scan args instead of raw args, no unquoted reading, no placeholder strip in the raw word — each turns a test red.

**Verification Steps for QA**: `newest_\numbered docs dod -delete` and `next_number''ed docs review -exec rm {} +` against the real `newest-numbered.sh` are `mutating`, `function … forwards its arguments to find`.

## QA Verification — cycle 2 (Reopened)

The cycle-1 repros are refused. `reach()` finds the function name as **literal text** in the prose, but the scan removes quotes and backslashes before it reads the name, so a respelling passes (CR2-1): `newest_\numbered docs dod -delete` and `next_number''ed docs review -exec rm {} +` classify `runnable` against the real `newest-numbered.sh`. Fix by running the check on the unquoted token stream `commandInvocations` produces (each invocation's word and args), not on a regex over the prose lines.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-10-19 | Reopened | qa-task | Not fixed by task.191.qa.2.snippet-engine-runs-pipeline-blocks.md — the named repro is refused, a respelling of it is not (cycle 2 CR2-1) |
| 2026-10-19 | In Progress | qa-fix | Investigation started (QA cycle 2) |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven (QA cycle 2) |
| 2026-10-19 | Closed | qa-task | Verified by task.191.qa.3.snippet-engine-runs-pipeline-blocks.md |

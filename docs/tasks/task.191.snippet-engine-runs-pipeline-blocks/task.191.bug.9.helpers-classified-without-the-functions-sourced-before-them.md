# Bug Report: Task 191 - A helper is classified without the functions an earlier helper defined

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-9
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2, CR2-5)
**Date Found**: 2026-10-19

## Description

Each helper is classified alone. When the block has already sourced a helper that defines a function with an allow-listed name (`ls() { find "$@"; }`), a later helper's call to that name runs the function, but the classifier reads it as `ls`. `export -f` carries the same function into a `bash` child.

## Steps to Reproduce

`h/h1.sh` = `ls() { find "$@"; }`, `h/h2.sh` = `ls docs -delete`. `source h/h1.sh; source h/h2.sh` → `runnable`; `export -f ls; bash h/h2.sh` → `runnable`.

## Expected Behavior

A later helper is classified with the caller's accumulated function definitions, so its calls go through the forwarded-argument check, and `export -f` refuses helper recognition.

## Actual Behavior

Classified runnable; `find docs -delete` runs.

## Impact

Two helpers that are each runnable alone combine into a write.

## Recommendation

Pass the caller's defines and forwarding map into each later helper's classification, and refuse `export -f` in a block with a helper call.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: A sourced helper was classified on its own, but it runs in its caller's shell, where the functions sourced before it are callable; and `export -f` passes a function to a child `bash`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: A sourced helper is classified with the caller's accumulated functions and their forwarding sets (`inherited`), so `h2.sh`'s `ls docs -delete` reads as the `find` it calls. `export -f` is refused (with the cycle-2 `assignmentHazard`).

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR2-5: a sourced helper is classified with the functions sourced before it`. Mutations: not passing `inherited`, and allowing `export -f`, each turn it red.

**Verification Steps for QA**: `source h/h1.sh; source h/h2.sh` and `export -f ls; bash h/h2.sh` are `mutating`.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 2 |
| 2026-10-19 | In Progress | qa-fix | Investigation started (QA cycle 2) |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven (QA cycle 2) |

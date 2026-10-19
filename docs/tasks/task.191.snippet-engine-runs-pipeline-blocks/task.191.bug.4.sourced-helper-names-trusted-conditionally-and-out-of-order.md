# Bug Report: Task 191 - Every name a sourced helper might define is trusted, anywhere in the block

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 1, CR-3)
**Date Found**: 2026-10-19

## Description

`prepareHelperText` collects function names from any line, so a definition inside `if false; then mv() {…}; fi` makes `mv` trusted, and the trust applies before the `source` line as well as after.

## Steps to Reproduce

Helper `h/cond.sh` = `if false; then mv() { echo shadow; }; fi`. `source h/cond.sh\nmv a b` → runnable; `mv a b\nsource h/cond.sh` → runnable. The real `mv` runs.

## Expected Behavior

Only top-level, unconditional definitions are trusted, never one that shadows a non-safe command, and only for invocations after the `source`.

## Actual Behavior

Classified runnable.

## Impact

Any helper with a conditional function definition launders a command name.

## Recommendation

Restrict defines to top-level unconditional definitions; refuse a defined name that is a non-safe or runner command; order-sensitive admission. Control tests for both shapes.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: Any name a sourced helper's text defined was trusted, including one defined inside a branch that never runs, or called before the `source` — then the real command runs.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: `shadowsCommand(name)`: a defined name that is a builtin, keyword or PATH command (asked of a fresh bash, and zsh when present) is never trusted. A name that shadows nothing fails as command-not-found in both cases, which writes nothing, so its position and branch no longer matter.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR-3: a helper name that shadows a real command is never trusted, wherever it is defined` (conditional, before the source, top-level) plus a non-shadowing control. Mutation: dropping the check turns it red.

**Verification Steps for QA**: `source h/cond.sh` + `mv a b`, either order → `unrecognised-command: mv`.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-10-19 | Closed | qa-task | Verified by task.191.qa.2.snippet-engine-runs-pipeline-blocks.md |

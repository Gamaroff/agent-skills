# Bug Report: Task 131 - The --args-json probe example reads two unbound variables

**Task**: [Link](./task.131.markdown-structure-sink-internal-validator-class.md)
**Bug ID**: TASK-131-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (code review CR-1)
**Date Found**: 2026-09-30

## Description

The fenced probe command added to `shared/resources/finalise-dod-security-prompt.md` Step 4 for a `(text, opts)` validator reads `$LINT_JS` and `$ARGS_JSON`, but nothing in the block binds them. The comment above says what they should hold, but that is prose, not a binding.

## Steps to Reproduce

Run the block as written in a fresh shell.

## Expected Behavior

The block either binds both values or uses `<placeholder>` substitutions like its sibling examples, so an agent copying it gets a working command.

## Actual Behavior

`--entry "#lintReport"` (empty path), and `--args-json ""` exits 2 with `bad-args`.

## Impact

The one example that shows how to probe a two-argument validator does not run. An agent following it gets a usage error and may fall back to recording `unverifiable`, which is the outcome this task exists to end.

## Recommendation

Bind `LINT_JS` to a `<path-from-repo-root>` placeholder and build `ARGS_JSON` inside the block from `loadTemplate()`, without restating a corpus fragment such as `-e`. Or switch both to `<placeholder>` form.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: The example was written with shell variables described in a comment, not bound in the block — a fenced block runs as its own shell.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: The block now uses `<placeholder>` operands like its sibling examples (`--entry '<path-from-repo-root>/report-lint.js#lintReport'`, `--args-json '<[{"sections": <the loadTemplate() result>}], as JSON>'`), and a prose paragraph after the fence gives the recipe for building the value (`node --print …loadTemplate()…`), including that it is the whole variant-keyed object.

**Files Modified**: `shared/resources/finalise-dod-security-prompt.md` (+ bundled copies).

**Testing**: `finalise-dod-prompt-contract.test.mjs` green, including the corpus-fragment scans (the recipe avoids the `-e` shell-exec fragment). The recipe was executed and prints the expected JSON.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Filed from QA cycle 1 |
| 2026-09-30 | In Progress | qa-fix | Investigation |
| 2026-09-30 | Ready for QA | qa-fix | Fix implemented (cycle 1) |

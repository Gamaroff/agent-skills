# Bug Report: Task 191 - `git diff` honours user config, so a coloured diff reads as "nothing changed"

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, CR-4)
**Date Found**: 2026-10-19

## Description

`changedLineRanges` runs `git diff -U0` with the user's config. With `color.diff=always` the hunk headers carry ANSI escapes, `parseDiffRanges` matches nothing, and the run reports zero changed blocks with no finding; `diff.external` / textconv do the same.

## Steps to Reproduce

`git -c color.diff=always diff -U0 …` output fed to `parseDiffRanges` → `[]` for a diff with four hunks.

## Expected Behavior

A failed read is an error (`bad-diff-base`), never an empty change set.

## Actual Behavior

An empty change set, silently.

## Impact

The exact "could not look reads as nothing changed" case §4a says cannot happen.

## Recommendation

`git diff --no-color --no-ext-diff --no-textconv -U0`; a non-empty diff with zero parsed hunks is `bad-diff-base`. Test with `-c color.diff=always`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: `git diff` honoured the user's `color.diff`, external-diff and textconv config, so hunk headers did not parse and the change set read as empty.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: `git diff --no-color --no-ext-diff --no-textconv -U0`. A diff with output beyond its headers and no parsed hunk is `bad-diff-base` (a mode-only change is headers alone and stays `[]`). A pure deletion is the gap after line `c`, so it marks only the block it falls inside (CR-6). An untracked file gets an `untracked-file` note (CR-8).

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR-4: the user's git colour config cannot empty the change set`, `… a diff with output and no hunk is bad-diff-base …`, `… a mode-only change is no hunk and no error`, `T191 CR-6 …`, `T191 CR-8 …`. Mutation: each turns red.

**Verification Steps for QA**: `git config color.diff always` in a repo, then `--diff-base HEAD` still marks the changed block.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

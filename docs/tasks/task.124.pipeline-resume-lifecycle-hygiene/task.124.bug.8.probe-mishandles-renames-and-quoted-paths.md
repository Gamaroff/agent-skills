# Bug Report: Task 124 - The dirty-tree probe mis-parses staged renames and quoted paths, then reports 'discarded' over an entry it never touched

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 2 (refute pass), code review finding CR-

## Description
The probe parses porcelain v1 with `p=${line:3}`. A staged rename (`R  old -> new`) or a quoted path (`"path with space"`) yields a pathspec that matches nothing: `git diff --quiet $BASE_REF -- <bad>` is quiet (classed overlay), `git checkout HEAD -- <bad>` errors without effect, and the cycle-1 porcelain re-read — filtered by the same bad pathspec — is empty, so the block prints 'overlay discarded (porcelain re-read: clean)' over an entry it never touched.

## Steps to Reproduce
On a branch: `git mv a b` (staged rename identical to base content); run the probe → 'overlay discarded … clean' while `git status --porcelain` still shows `R  a -> b`.

## Expected Behavior
Renames and quoted paths are never classified (a): the status is read with `--no-renames`, an entry whose path starts with a quote is class (c), and the re-read is the FULL porcelain, which must be empty after an all-(a) discard.

## Actual Behavior
A success line over an untouched entry.

## Impact
The re-read added for CR-4 (cycle 1) can be satisfied vacuously.

## Recommendation
`git status --porcelain --no-renames`; reject quoted paths to (c); re-read the full porcelain and HALT on anything left.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
`p=${line:3}` assumes every porcelain entry is a plain path; renames carry an arrow expression and special characters are C-quoted. The cycle-1 re-read filtered by the same pathspec, so it could not see what the pathspec could not address.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
`git status --porcelain --no-renames` (a rename becomes a `D` and an `A`; the `A` is not in the base → (c)); a quoted path is class (c) before any test runs; the post-discard re-read is the FULL porcelain, which must be empty after an all-(a) discard.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md`

**Testing**:
- fixture 13: 12/12; fast gate green

**Verification Steps for QA**:
1. `git mv a b` on a branch → probe → HALT (class c), never 'discarded'
2. A file with a space in its name → probe → HALT (class c)

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |

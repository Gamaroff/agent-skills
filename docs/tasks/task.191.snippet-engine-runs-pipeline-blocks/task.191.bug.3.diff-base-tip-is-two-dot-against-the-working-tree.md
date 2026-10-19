# Bug Report: Task 191 - The callers' `--diff-base` names the base tip, so develop's own edits count as the PR's

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, CR-2)
**Date Found**: 2026-10-19

## Description

qa-task Step 4b and qa-story Phase 1.7 pass `origin/<base>` as `--diff-base`; `git diff <rev> -- <file>` compares that tip with the working tree. Once develop moves, its edits read as this change's blocks and can raise `changed-blocks-not-executed` for blocks the PR never touched.

## Steps to Reproduce

Any branch behind `origin/develop` on a file develop has since edited.

## Expected Behavior

The changed set is the PR's own change (merge-base to HEAD).

## Actual Behavior

The changed set includes develop's later edits, reversed.

## Impact

A gate-eligible finding about blocks the work item did not touch.

## Recommendation

Pass `$(git merge-base "$BASE" HEAD)` in both callers and say so in §4a; the parity test pins it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: `git diff <rev> -- <file>` compares `<rev>` with the working tree; with `origin/<base>` as `<rev>`, every later edit on the base branch counted as this change's.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: qa-task Step 4b and qa-story Phase 1.7 pass `--diff-base "$(git merge-base "$BASE" HEAD)"`, and name the file `{changed-file}` (CR-5). §4a says to pass the merge base.

**Files Modified**:

- `skills/qa-task/SKILL.md`
- `skills/qa-story/SKILL.md`
- `shared/resources/qa-runnable-prose-detection.md`
- `evals/shared/tests/qa-execution-step-parity.test.mjs`

**Testing**: The parity test now asserts the merge-base form in both skills. Mutation: reverting either caller to `"$BASE"` turns it red.

**Verification Steps for QA**: Read both Step 4b blocks; `npm run test` parity suite 12/12.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

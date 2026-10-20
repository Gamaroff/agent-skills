# Bug Report: Task 200 - sync-github-story drops the caller's durable-branch pin

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2, refute pass)
**Date Found**: 2026-10-20

## Description

`skills/sync-github-story/SKILL.md:158` passes `--explicit "${DOC_BRANCH:-}"`, and nothing in the block binds `DOC_BRANCH`. review-story (SKILL.md:2336, 2415) and finalise invoke the sub-skill with `DOC_BRANCH={PIN_BRANCH}`. That is a skill input, not a shell variable, so in a fresh shell the pin is empty. The resolver then falls through to the upstream or default rule, and the durable-branch pin that keeps a story's link alive after its feature branch is deleted is silently dropped.

`develop` read the same unbound `${DOC_BRANCH:-…}`, so the read predates this branch. It is in scope because this branch rewrote the line and fixed the same class at the path variable (TASK-200-002), and cycle 1's execute test only ever runs the unset path. (Code review CR-2, cycle 2.)

## Steps to Reproduce

1. Run the sync-github-story link lines with `STORY_RELATIVE_PATH` bound and no `DOC_BRANCH`, as a caller passing `DOC_BRANCH=develop` as a sub-skill input leaves the shell.
2. Observe the printed branch.

## Expected Behavior

The block binds the pin from a `{placeholder}` the caller fills (empty when no pin was passed), and a set pin is printed verbatim.

## Actual Behavior

The pin is always empty, so the block prints the upstream or default branch.

## Impact

A story re-synced by review-story or finalise to pin its link to `develop` keeps a feature-branch link, which 404s once that branch is deleted. This is the obs #287 shape the task exists to remove.

## Recommendation

Add `DOC_BRANCH_PIN="{DOC_BRANCH input, or empty}"` before the call and pass `--explicit "${DOC_BRANCH_PIN}"`. Add an execute-test case where the pin is set and must be printed.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 2)

**Root Cause Analysis**: sync-github-story passed `--explicit "${DOC_BRANCH:-}"`. `DOC_BRANCH` is a skill input that review-story fills, not a shell variable, so in the block's shell it was always empty and the pin was dropped. The execute test checked only the path variable's binding.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: The block binds `DOC_BRANCH_PIN="{the DOC_BRANCH input, or empty when the caller passed none}"` and passes `--explicit "${DOC_BRANCH_PIN}"`. The execute test now fails any call that reads a variable its own block never binds, and a new test runs every pinned site with a pin set and expects it printed verbatim. review-story's description of the empty-pin fallback now names the resolver's rule, not the old current-branch default.

**Files Modified**:

- `skills/sync-github-story/SKILL.md`
- `skills/review-story/SKILL.md`
- `tests/doc-link-branch-sites-execute.test.js`

**Testing**: The control test proves the unbound-read check reports the pre-fix `${DOC_BRANCH:-}` shape. Mutations: reverting the call to `${DOC_BRANCH:-}` turns the test red, and so does deleting the pin binding.

**Verification Steps for QA**:

1. `command node --test tests/doc-link-branch-sites-execute.test.js`: all pass.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 2 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 2) |

# Bug Report: Task 243 - Phase 0 wireframe writes block branch creation at Step 1

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

Phase 0 of the develop pipelines writes consumer files before the branch exists:

- 0c-wire runs `wireframe-map.js ensure`, which creates the catalogue and the map when they are
  missing, and adds catalogue rows for new barrel exports
  (`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:630`);
- 0d runs `wireframe-map.js record` for each confirmed answer, appending to the map (line 741).

Step 1 then stashes only the implementation report
(`shared/resources/develop-pipeline-step-1-create-branch.md:38–49`), and `/create-branch` stops on
any uncommitted file other than `*.implementation.*.md` (`skills/create-branch/SKILL.md:335–347`).

## Steps to Reproduce

1. A consumer sets `ui.wireframeMap`, has no catalogue or map yet, and runs `/develop-story` on a
   story with a wireloom block, from `develop`.
2. 0c-wire's `ensure` creates `docs/…/components.md` and the map file.
3. Step 1 invokes `/create-branch`, which finds both new files uncommitted.

## Expected Behavior

The branch is created, and the catalogue, the map and any confirmed links land on it.

## Actual Behavior

`/create-branch` stops and asks the person to commit or stash. If they stash, the confirmed
answers sit in a stash the pipeline never restores. The step-0 text also says "Phase 0 stays
side-effect free" (line 637), which is false.

## Impact

The first develop run in every consumer that turns the feature on halts at Step 1. It also halts
whenever a new barrel export or a confirmed answer has to be written. Only a run whose branch
already exists, where Step 1 is skipped, avoids it.

## Recommendation

Keep Phase 0 read-only. Run only `resolve` in 0c-wire: it already treats a missing map as all-open.
Hold the 0d answers in the lock or in `.claude/state`, then run `ensure` and the `record` calls after
the branch exists, for example at Step 1's post-branch steps. Add a test that runs the Phase 0 blocks
and then asserts that `git status` holds no tracked or untracked consumer file.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: the develop half of the mapping procedure ran its writes where its questions are
asked, in Phase 0. Phase 0 runs before Step 1, and Step 1's `/create-branch` accepts only the
implementation report as an uncommitted file.

**Fix**: Phase 0 is read-only again.
- `develop-pipeline-step-0-resolve-and-prepare.md`: 0c-wire runs `resolve` only, which reads a
  missing map as no confirmed links. 0d holds the answers in `.claude/state/wireframe-answers.json`
  (ignored) instead of writing them.
- `develop-pipeline-step-3-develop-loop.md`: a new first section, "Wireframe writes", runs `ensure`
  and writes the held answers (component-table rows; one `record` per confirmed answer) on the
  branch. Step 3 always runs after the branch exists, whether Step 1 created it or found it.
- `wireframe-component-mapping.md`: its "where each skill runs it" table and step 1 say so.

**Testing**: in `evals/shared/tests/wireframe-mapping-hooks.test.mjs`, the 0c-wire test now runs
the block in a consumer with a catalogue path and barrel configured but no catalogue or map. It
asserts that no file outside `.claude/` and `.agents/` appeared. A new test runs the Step 3 block in
the same consumer and asserts the catalogue and the map were created. Mutation-proven: restoring
`ensure` in 0c-wire turns the first red, and removing it from Step 3 turns the second red.

**Verification for QA**: in a consumer with the feature on and no catalogue, run the 0c-wire block,
then `git status`. Expect nothing new outside `.claude/state`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 2 (refute pass, CR-1), confirmed against step-1 and create-branch |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with two mutation-proven tests (qa-fix cycle 2) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 3: clean-tree test mutation-proven; Phase 0 writes no tracked file at 8ec313f5 |

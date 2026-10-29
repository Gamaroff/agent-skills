# Bug Report: Task 243 - Phase 0 `0c-wire` fails on a fresh checkout

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

The `0c-wire` block in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:630`
redirects `resolve`'s output to `.claude/state/wireframe-map.json`. It is the first Phase 0 block
that writes under `.claude/state`. The first `mkdir -p .claude/state` comes later, in 0d (line 771);
0c-reg has one too, but 0c-reg runs from Step 1.

## Steps to Reproduce

Run the 0c-wire block, as delivered, in a consumer checkout with no `.claude/state` directory.

Measured (QA cycle 1, bash): `.claude/state/wireframe-map.json: No such file or directory`,
exit 1. `resolve`'s output is lost.

## Expected Behavior

The block writes the resolve output and exits 0.

## Actual Behavior

The redirect fails, so `WIREFRAME_OPEN` has nothing to read on the first pipeline run in a project.

## Impact

The first develop run in any consumer that enables the feature cannot read its open nodes. A
resumed run works, which hides the defect.

## Recommendation

Add `mkdir -p .claude/state` at the top of the block, as 0d does.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: 0c-wire is the first Phase 0 block that writes under `.claude/state`. The block that
creates the directory comes later, in 0d.

**Fix**: `mkdir -p .claude/state` now opens the 0c-wire block in
`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`. Both develop skills' and
`develop-bug`'s bundled copies were refreshed by `npm run bundle`.

**Testing**: new test in `evals/shared/tests/wireframe-mapping-hooks.test.mjs`: "the 0c-wire block
runs in a fresh checkout and writes the resolve output". It extracts the block from the step doc,
fills its two placeholders, refuses one left unfilled, and runs it under bash in a consumer with no
`.claude/state`. It asserts exit 0 and the resolve output. Mutation-proven: removing the `mkdir`
turns it red.

**Verification for QA**: run the block as delivered in a checkout without `.claude/state`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 1: code review CR-5, reproduced by executing the block (Step 4b) |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with a mutation-proven regression test (qa-fix cycle 1) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 2: regression test is mutation-proven, repro no longer fires at 8b431651 |

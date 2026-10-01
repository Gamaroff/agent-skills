# Bug Report: Task 172 - The Step 7 canonical comment records a tree-equivalent reading as plain SUCCESS

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-3
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1 diff review)
**Date Found**: 2026-10-01

## Description

In `skills/finalise/SKILL.md`, the Step 7 canonical-comment block prints reading 1 with
`${CI_TREE_EQ:+...}` but `CI_TREE_EQ` is bound in the Step 6 block (another shell), and the reading 2 line
prints `${CI_ROLLUP_2}` with no tree-equivalent suffix at all. The PR comment can record plain `SUCCESS` for a
reading the docs-only rule satisfied.

## Expected Behavior

Every recorded form of a tree-equivalent reading names the commit CI verified (`never plain SUCCESS`).

## Actual Behavior

Reading 2 never carries the suffix; reading 1 carries it only if the agent re-binds the variable.

## Impact

The record stops saying which commit CI verified, which is the property the `SUCCESS (tree-equivalent to <sha>)`
form exists to keep.

## Recommendation

Add `${CI_TREE_EQ_2:+ (tree-equivalent to ${CI_TREE_EQ_2})}` to the reading 2 line, state that both are inputs
the agent re-binds, and extend `finalise-publish-boundary.test.mjs` to assert reading 2.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 1)

Reproduced by QA before gating; reproduction re-run before the fix and after it.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause: reading 2's line in the Step 7 canonical comment had no tree-equivalent suffix, and the reading 1 line
expanded a variable bound in another shell with no statement that it is an input.

Fix: reading 2 now carries `${CI_TREE_EQ_2:+ (tree-equivalent to ${CI_TREE_EQ_2})}`, and the block states that
`CI_TREE_EQ` and `CI_TREE_EQ_2` are inputs bound from the recorded readings, like `CI_ROLLUP`. The publish-boundary pins
for both readings now REQUIRE the suffix (an optional group let reading 2 lose it unnoticed).

Files: `skills/finalise/SKILL.md`, `evals/shared/tests/finalise-publish-boundary.test.mjs`.
Mutation proof: removing the reading 2 suffix turns `both CI readings carry a head ...` red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-01 | New          | QA         | Found in QA cycle 1            |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started          |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

# Bug Report: Task 172 - An ancestor whose checks were all skipped reads as green

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-2
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1 diff review, reproduced by QA)
**Date Found**: 2026-10-01

## Description

`reduceChecks` maps a completed check run with conclusion `skipped` or `neutral` to `SUCCESS`, as `/finalise`
Step 6 does. Applied to a **single ancestor** that is the whole evidence, an ancestor whose only checks were
skipped (a path-filtered workflow that did not trigger) is read as green. Reproduced:
`reduceChecks({checkRuns:[{status:"completed",conclusion:"skipped"}]})` returns `SUCCESS`.

## Expected Behavior

A skipped job is not a failure, but it verified nothing. An ancestor needs at least one real success.

## Actual Behavior

An all-skipped ancestor is a green ancestor, so a docs-only head can launder a code commit CI never ran.

## Impact

Wrong accept on exactly the commits whose workflows were filtered out.

## Recommendation

An ancestor whose checks are all skipped or neutral is `NONE`. Keep skipped/neutral as passing when at least
one check or status succeeded. Test both.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 1)

Reproduced by QA before gating; reproduction re-run before the fix and after it.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause: `reduceChecks` mapped skipped/neutral to SUCCESS, copying the head rule from `/finalise` Step 6. For a head
that is right (a paths-filtered job is not a red); for the single ancestor that is the whole evidence it is wrong.

Fix: skipped/neutral now pass only beside at least one real success (a successful check run or commit status). An
ancestor with only skipped/neutral checks reduces to `NONE`, which is never green. The head reduction in `/finalise`
is unchanged.

Files: `shared/resources/ci-tree-equivalence.js`, `docs/reference/configuration.md`, `skills/finalise/SKILL.md`.
Tests: the `reduceChecks` table and `CR-2: an ancestor whose only checks were skipped ...` (CLI). Mutation proof: returning
`SUCCESS` unconditionally turns both red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-01 | New          | QA         | Found in QA cycle 1            |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started          |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

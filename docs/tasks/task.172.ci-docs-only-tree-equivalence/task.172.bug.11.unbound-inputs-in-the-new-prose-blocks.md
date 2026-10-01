# Bug Report: Task 172 - The new prose blocks read variables bound in other blocks, silently

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-11
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; confirmed in source)
**Date Found**: 2026-10-01

## Description

The arm blocks read CI_ROLLUP bound by the previous block, the Step 7 comment reads CI_TREE_EQ and CI_TREE_EQ_2 with no writer (unbound writes plain SUCCESS, the record the rule forbids), develop-next reads PR_HEAD from an earlier block, and an empty --head silently falls back to HEAD. Confirmed by reading.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Make each block fail loudly on an unbound input (${VAR?...} for the Step 7 comment, a guard in each arm), and reject an empty option value in the engine (usage error).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: each arm block now aborts naming the variable when an input is unbound (`${CI_ROLLUP:?...}`, plus `PR_NUMBER` in finalise and `PR_HEAD`, `PR_ID` in develop-next); the Step 7 comment aborts when `CI_TREE_EQ` or `CI_TREE_EQ_2` is UNSET (`${VAR?...}`, which accepts empty), so an unbound variable can no longer write plain SUCCESS; the engine rejects an empty option value, so `--head ""` cannot fall back to HEAD; `develop-batch` states that the block runs from the item's worktree.

Tests RUN the extracted blocks under bash and zsh (a grep cannot see an unbound variable). One real defect surfaced by doing so: an apostrophe inside `${VAR?word}` breaks bash 3.2, the macOS default, so the message avoids it and a test forbids it. Mutation proofs G8a to G8d.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

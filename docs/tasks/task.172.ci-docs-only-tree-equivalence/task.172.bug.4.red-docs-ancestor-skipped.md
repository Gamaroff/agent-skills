# Bug Report: Task 172 - A nearer red docs-only ancestor is walked past and an older green ancestor greens the head

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-4
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; reproduced by QA)
**Date Found**: 2026-10-01

## Description

A nearer ancestor that is FAILURE, with a docs-only delta to the head, is skipped and an older green ancestor makes the head tree-equivalent. Reproduced: code c1, code c2 (green), docs c3 (failing check), docs head c4 gives exit 0 tree-equivalent to c2. The red docs state is inherited by the head.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Stop the walk with a non-green answer when an ancestor whose delta to the head is docs-only reads FAILURE. CANCELLED stays walkable (cancel-in-progress supersedes runs on every push).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause: the walk treated every non-green ancestor as "keep looking", so a red docs-only ancestor was invisible once an older commit was green.

Fix: an ancestor whose delta to the head is docs only and whose rollup is FAILURE now stops the walk with `no-green-ancestor` (detail names it as red). CANCELLED is still walked past, because cancel-in-progress cancels the run of every superseded push.

Tests: `CR2-1` pure table and the real-git chain (code, green code, RED docs, docs head). Mutation proof G1: disabling the stop turns both red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

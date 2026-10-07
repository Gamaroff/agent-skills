# Bug Report: Task 172 - The glob matcher is exponential on repeated wildcards

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-27
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: /finalise DoD security agent (and, for BUG-26, the Step 5c PR review as CR-1); reproduced by the agent and re-run by the orchestrator
**Date Found**: 2026-10-01

## Description

ci.docsOnly.patterns come from the head commit's skills-config.yaml. glob-match.js compiled each glob to a RegExp and collapsed runs of `*`, which closed one backtracking shape; `*a` repeated N times against `a` x 40 + `c` still took 131 ms at N=6, 3.4 s at N=8 and 15.3 s at N=9, and `**/` repeated against a non-matching path did the same (19.6 s at N=10, measured by the agent). The engine has no overall timeout, so a head author can hang the calling step.

## Expected Behavior

A pattern is matched in time proportional to its length times the path length, whatever it looks like.

## Actual Behavior

See the description.

## Impact

A hang, not a wrong answer: the pipeline step that called the engine (and the 6c poll's decision loop) stalls.

## Recommendation

Do not guard another spelling: replace the backtracking engine with a matcher that cannot backtrack.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (post-DoD fix, outside a numbered QA cycle)

Reproduced before the fix: `*a` x 9 took 15.3 s here (re-measured).

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

The matcher is no longer a RegExp. `globMatch(glob, path)` tokenises the glob and walks the path once per token with a set of reachable positions, so the cost is tokens times path length; globs over 1,024 characters and paths over 4,096 never match. It keeps the old semantics, including that `**` does not cross a line terminator. Test `SEC-2` holds the three exponential shapes under one second and compares 20,000 deterministic small cases with a reference RegExp (400,000 were compared during development, no difference); the old RegExp implementation put back turns it red (after minutes).

## Status History

| Date       | Status       | Changed By | Notes                                  |
| ---------- | ------------ | ---------- | -------------------------------------- |
| 2026-10-01 | New          | finalise   | Found by the DoD security gate         |
| 2026-10-01 | In Progress  | develop    | Investigation started                  |
| 2026-10-01 | Ready for QA | develop    | Fix implemented and mutation-proven    |

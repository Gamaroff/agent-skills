# Bug Report: Task 172 - An ancestor read while its check lanes are still registering reads green

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-12
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; reproduced by QA; severity re-rated (reviewer: high))
**Date Found**: 2026-10-01

## Description

A just-pushed ancestor whose one fast lane has completed while the slow lanes have not yet registered reduces to SUCCESS (reproduced with one completed check-run dated now). This is the obs #87 partial-rollup window, guarded for the head by CI_CHECKS_1 but not for the ancestor. Reviewer rated it high; QA rates it medium: every call site reads an ancestor whose own CI the pipeline already waited on, so the window is minutes after a push, not a state any call site reaches.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

Treat an ancestor whose newest completed check or status is younger than ci.docsOnly.settleSeconds (default 300) as PENDING.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause (the ancestor-green derivation again, cycles 1 to 3): a green read of an ancestor takes whatever lanes have registered so far.

Fix: an ancestor must have settled. Its newest completed check or status must be at least `ci.docsOnly.settleSeconds` (default 300) old; a SUCCESS with no timestamp cannot be shown to have settled and is PENDING; `0` turns the guard off. Implemented in `settle()`, applied by both the GitHub and the Bitbucket readers.

Tests: the pure `settle` table, the CLI cases (fresh, settled, no timestamp, `settleSeconds: 0`, invalid values). Mutation proof H1.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

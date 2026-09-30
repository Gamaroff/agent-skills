# Bug Report: Task 135 - The freshness test still goes red when develop-batch rebases an open PR

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute pass, CR2-2)
**Date Found**: 2026-09-30

## Description
Cycle 1 scoped the history rules to gates the branch touches, which covers a gate merged earlier. `develop-batch` Step 3 rebases the second and later items **while their PRs are open**, then runs the quality gate on the rebased branch and waits for CI. Those items' gates are on-branch, their `head:` is the pre-rebase SHA: "not an ancestor of HEAD" locally, "does not exist in this checkout" in CI after the force-push. Every rebased item HALTs.

## Expected Behavior
The corpus test holds only invariants a rewrite cannot break; history invariants are checked where history is intact.

## Recommendation
Drop existence/ancestry from the corpus test (keep format; check author time whenever the head resolves); enforce existence/ancestry in the loop (the Step 3b block already HALTs on it) and at the 5c conformance lens, which runs before any develop-batch rebase. Amend success criterion 3 with the reason.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Mechanism replaced (pre-strike move): the corpus test keeps only rewrite-proof rules — 40-hex head, parseable `updated:`, author time when the head resolves; an unresolvable head is a diagnostic. Existence/ancestry: Step 3b HALTs at the next cycle, and a new 5c trail row. Criterion 3 amended in the task document. Mutation M15 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 2 |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 3 |

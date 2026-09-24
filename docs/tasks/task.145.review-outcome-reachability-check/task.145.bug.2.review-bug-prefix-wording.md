# Bug Report: Task 145 - review-bug check asks a pre-fix review about "the fixed code"

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1; raised by code review CR-2 at medium confidence, confirmed by QA)
**Date Found**: 2026-09-25

## Description

The new review-bug Step 3 bullet reads: "walk that input through the named function's decision
branches and confirm a branch of the fixed code returns it … → **Important**, naming the branch that
fires instead". `/review-bug` runs before any fix exists (develop-bug Step 2). In the current code, the
branch that fires for the reproduction input is by definition the one producing the **Actual**
behaviour.

## Steps to Reproduce

Apply the bullet literally to any bug whose Expected Behavior names a function outcome. Walking the
reproduction input through today's code reaches the Actual branch, so the Expected outcome is "not
the branch that fires" and the bullet directs an Important finding.

## Expected Behavior

The check separates two things. An Expected outcome the function **can** return (an existing branch,
or one the fix can add without contradicting another stated behaviour) is fine. An Expected outcome no
branch could return for that input is an Important finding. The Actual branch firing today is the
bug, not a finding.

## Actual Behavior

The wording invites an Important finding on every such bug. That is the over-firing the task's Risk
Assessment names as its rollback trigger.

## Impact

False Important findings in `/review-bug`'s fix-readiness score, and noise that trains reviewers to
ignore the check.

## Recommendation

Reword it for a pre-fix review, keeping the three test elements (reproduction input, named function,
branch that fires). Say explicitly that the branch firing today is the Actual.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The bullet was adapted from the review-task wording without accounting for review-bug running before the fix. "The branch that fires" in today's code is the Actual branch.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The bullet now says the branch that fires today returns the Actual, which is the bug and not a finding. The question becomes whether the Expected outcome is one the function can return for the reproduction input, either from an existing branch or from one the fix can add without breaking another behaviour the report or the function's contract states. An unreachable Expected outcome stays **Important**, naming the branch that fires and the contract that rules the Expected outcome out. The three test elements (reproduction input, named function, branch that fires) are kept.

**Files Modified**:

- `skills/review-bug/SKILL.md`

**Testing**: The population test is green, and review-bug's three element mutants are red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 1 (QA-2) |
| 2026-09-25 | Ready for QA | qa-fix | Reworded for a pre-fix review |

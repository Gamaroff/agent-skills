# Bug Report: Task 145 - The population test does not hold the check's verdict

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, CR2-2)
**Date Found**: 2026-09-25

## Description

The three elements (stated input, named function, branch that fires) say what the check is about. None
of them holds what the check **decides**. After cycle 1, the "branch that fires" phrase survives in
sentences that are not the verdict.

## Steps to Reproduce

1. In `skills/review-bug/SKILL.md`, replace everything from "The question is whether" through
   "→ **Important**" with "Never flag it." → `fail 0`.
2. In `skills/review-task/SKILL.md`, delete the "Confirm the stated outcome is the **branch that
   fires**" bullet → `fail 0`.

## Expected Behavior

Deleting or inverting the verdict sentence at any site turns that site's test red.

## Actual Behavior

The suite stays green.

## Recommendation

Add a verdict element carried only by the decision sentence (e.g. `/unreachable/`). Mutation-prove it
by deleting the sentence, not a phrase.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The element set named the subject of the check, not its decision.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: Each site now also holds its verdict sentence: review-task and review-story "Important when the outcome is unreachable", create-task "Put it to the author, and never auto-fix it", review-bug "unreachable Expected outcome … → Important".

**Files Modified**: tests/outcome-reachability-check.test.js

**Testing**: Both gate-2 reproductions are now red: review-bug's verdict inverted to "Never flag it.", and review-task's Flag bullet deleted. The review-story Flag bullet and the create-task verdict are red too. Deleting review-task's "Confirm … branch that fires" bullet stays green by design. It restates the premise of the verdict, which is held on its own, so it is recorded as `no-red-untested`, accepted.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 2 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 2 fix |
| 2026-09-25 | Closed | QA Engineer | verified FIXED at QA cycle 3; holds at QA cycle 6 (suite 4002/4003 pass, 0 fail) |

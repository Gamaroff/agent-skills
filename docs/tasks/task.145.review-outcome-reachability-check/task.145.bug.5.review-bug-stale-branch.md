# Bug Report: Task 145 - review-bug reachability bullet passes a bug whose branch already returns the Expected

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, CR2-3, confirmed by QA)
**Date Found**: 2026-09-25

## Description

The bullet asserts that "The branch that fires today returns the Actual." For a stale bug, the
reproduction input already reaches a branch returning the Expected outcome. The bullet counts that as
reachable ("from a branch it already has") and moves on. Walking the code has just produced direct
evidence for Step 3's own *Critical (likely already fixed)* rule, and the bullet throws it away.

## Expected Behavior

If the branch firing today already returns the Expected outcome, report it under the likely-already-fixed rule.

## Actual Behavior

It passes silently as "reachable".

## Recommendation

Add that clause to the bullet.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The bullet assumed today's branch always returns the Actual.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: Added: "If the branch that fires today already returns the Expected outcome, the bug may already be fixed. Report it under this step's likely-already-fixed rule (Critical), not as reachable." It is held by the test as review-bug's second hold.

**Files Modified**: skills/review-bug/SKILL.md

**Testing**: Deleting the clause → red, naming it.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 2 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 2 fix |
| 2026-09-25 | Closed | QA Engineer | verified FIXED at QA cycle 4 (residue CR3-3); holds at QA cycle 6 (suite 4002/4003 pass, 0 fail) |

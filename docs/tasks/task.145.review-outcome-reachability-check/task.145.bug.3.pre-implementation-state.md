# Bug Report: Task 145 - Pre-implementation sites check reachability against today's code, not the planned code

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, CR2-1)
**Date Found**: 2026-09-25

## Description

create-task 3.5, review-task Step 3 check 10 and review-story Step 4 check 7 all run **before**
implementation. Each tells the reviewer to open the named function, walk the stated input through it,
and confirm the promised outcome is the branch that fires. When the task's own plan adds or changes
that branch, the outcome is unreachable **today** by design.

## Steps to Reproduce

1. Take a task whose Success Criteria say `classify(x)` returns `blocked` for input `x`, and whose
   Phase 1 adds the `blocked` branch to `classify`.
2. Apply review-task check 10 as written. Today's code has no `blocked` branch, so the finding is
   Important: "unreachable".
3. Apply create-task 3.5 as written. The bullet sits under *Critical (auto-fix)* and says "if another
   branch fires, write the outcome it actually returns". The criterion is rewritten to today's
   behaviour.

## Expected Behavior

Reachability is judged against the function **as the plan leaves it**: its current branches plus
those a planned phase adds or changes. Only an outcome that neither produces is flagged. create-task
never auto-rewrites a criterion to current behaviour.

## Actual Behavior

The review raises false Important findings on every task that changes its deciding function. At
authoring time the defect is worse: the auto-fix inverts the task's intent.

## Impact

This is the task's own rollback trigger ("false Important findings on correct documents"). The
authoring-time variant silently corrupts the document it reviews.

## Recommendation

Evaluate reachability against the planned state at all three sites. Make create-task's form raise the
finding with the author instead of rewriting it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: Walking the input through today's code at a pre-implementation site treats a planned change as a defect.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: All three pre-implementation items now walk the input through the branches **as the plan leaves them** (today's plus any a planned phase adds or changes). An outcome a planned phase produces is reachable, and only an outcome no current or planned branch returns is flagged. create-task's bullet says **put it to the author, and never auto-fix it**, and its closing "Fix all Critical items" line carries the matching exception. The worked example notes that `computeVerdict` was not changed by task.144's plan, so it still stands.

**Files Modified**: skills/review-task/SKILL.md, skills/review-story/SKILL.md, skills/create-task/SKILL.md

**Testing**: The test holds a planned-state element at the three sites (`/as the plan leaves them/`). Removing it at each site → red, naming it (3/3).

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 2 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 2 fix |

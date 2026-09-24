# Bug Report: Task 145 - Hallucination-pattern lines still judge against today's code

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR3-2)
**Date Found**: 2026-09-25

## Description

The Common Hallucination Patterns line in each section says "no branch", with no current-or-planned qualifier, so it contradicts check 10 / check 7 in the same section.

## Location

skills/review-task/SKILL.md, skills/review-story/SKILL.md

## Recommendation

See gate 3 `CR3-2` suggested_action.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Root Cause**: The cycle-2 fix updated the check item but not the second statement of the same rule in each section.

**Fix Description**: Both lines now read "no current or planned branch". The test gained section-level holds (the planned-state line must be present) and forbids (the "no branch of the named function returns" wording must be absent) for review-task and review-story.

**Files Modified**: skills/review-task/SKILL.md, skills/review-story/SKILL.md, tests/outcome-reachability-check.test.js

**Testing**: Reverting either line → red (2/2).

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 3 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 3 fix |

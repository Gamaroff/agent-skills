# Bug Report: Task 145 - review-bug stale clause routes to a rule that never fires for it

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR3-3)
**Date Found**: 2026-09-25

## Description

The likely-already-fixed rule, the STALE row and the QP2 close prompt fire only on PREPASS_STALE = unlikely. An in-line walk finding is misrouted to NEEDS DETAIL.

## Location

skills/review-bug/SKILL.md

## Recommendation

See gate 3 `CR3-3` suggested_action.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Root Cause**: The likely-already-fixed rule, the STALE row and the QP2 prompt keyed on PREPASS_STALE only.

**Fix Description**: All three now also fire when the Step 3 reachability walk finds the branch that fires today already returns the Expected outcome. That branch is the `found_at`. The Step 3 rule is held by a section-level hold.

**Files Modified**: skills/review-bug/SKILL.md, tests/outcome-reachability-check.test.js

**Testing**: Removing the widened clause → red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 3 |
| 2026-09-25 | Ready for QA | qa-fix | cycle 3 fix |

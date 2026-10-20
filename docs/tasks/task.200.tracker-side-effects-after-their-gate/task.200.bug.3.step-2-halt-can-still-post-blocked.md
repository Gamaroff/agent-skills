# Bug Report: Task 200 - A Step 2 halt says nothing was posted, but can still post `blocked`

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1 diff code review, CR-2, verified)
**Date Found**: 2026-10-20

## Description

The NEEDS DETAIL / DUPLICATE / STALE rows and the Step 2 text in `skills/develop-bug/SKILL.md` now
say "nothing was pushed or posted". Two other rules contradict that:

- The unchanged terminal-HALT rule (`skills/develop-bug/SKILL.md:360`) signals Jira `blocked`
  whenever `TRACKER=jira` and `TRACKER_ISSUE` is set.
- Phase 0c (`develop-pipeline-step-0-resolve-and-prepare.md`, the `TRACKER_ISSUE=$(grep '^jira_key:' …)`
  block) binds `TRACKER_ISSUE` from a `jira_key` the bug already carries.

So a STALE or DUPLICATE bug that already has a Jira card is moved to Blocked before READY TO FIX.

## Expected Behavior

A fix-readiness halt before Step 2b writes nothing to the tracker, or the halt message says what it
did write.

## Actual Behavior

The card moves to Blocked while the message tells the operator nothing was posted.

## Recommendation

Exempt the Step 2 halts from the terminal-HALT `blocked` signal, since the gate that declined the
bug is not a blocker. Alternatively, have the halt message name the signal when it fires. Pin
whichever is chosen in `develop-bug.test.js`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 1)

**Root Cause Analysis**: The terminal-HALT rule posted Jira `blocked` whenever `TRACKER_ISSUE` was set, and named a failed fix-readiness gate as a real blockage. Phase 0c binds `TRACKER_ISSUE` from an existing `jira_key`, so a Step 2 halt on such a bug moved its card, while the halt message said nothing was posted.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: Chose the exemption, the bug's recommended option. The rule now fires only after Step 2b, says it never fires on a halt at or before Step 2, and no longer lists a failed fix-readiness gate as a blockage.

**Files Modified**:

- `skills/develop-bug/SKILL.md`
- `skills/develop-bug/tests/develop-bug.test.js`

**Testing**: New test `the terminal-HALT blocked signal excludes the Step 2 halts`. Mutation: against the cycle-1 head's SKILL.md it is red (29 pass, 1 fail).

**Verification Steps for QA**:

1. `command node --test skills/develop-bug/tests/`: 30/30.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 1 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 1) |
| 2026-10-20 | Closed | qa-task | Verified by task.200.qa.2.tracker-side-effects-after-their-gate.md |

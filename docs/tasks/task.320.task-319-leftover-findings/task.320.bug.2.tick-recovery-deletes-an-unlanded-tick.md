# Bug Report: Task 320 - The stated recovery can delete a tick that never landed

**Task**: [Link](./task.320.task-319-leftover-findings.md)
**Bug ID**: TASK-320-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-25

## Description

The limit of T319-CR-1301 tells the agent: the second PR conflicts, so close it, delete the tick branch and mark `ticked: true` (T320-CR-102). A tick that never landed, whose row the base changed since, also answers `resume` and also opens a PR that conflicts.

## Steps to Reproduce

`shared/resources/tests/tick-pr.test.mjs`, the `- [~] 2` case: the base says something else in the row, the tick is not on it, and `start` answers `resume`.

## Expected Behavior

The branch is deleted and `ticked: true` written only when the base is seen to record the item.

## Actual Behavior

The prose gives one instruction for both states, in `skills/develop-next/SKILL.md`, `docs/reference/configuration.md` and `shared/resources/tick-pr.sh`.

## Impact

An acceptance that was never recorded is marked recorded, and the only copy of its tick is deleted.

## Recommendation

Give the recovery its condition: the row on `origin/<base>` records the item. Otherwise HALT and delete nothing.

## Developer Fix Cycle 1

**Date**: 2026-11-25

**Root cause**: the recovery was written for the one case the limit names, and the same answer, `resume` with a conflicting PR, has another cause.

**Fix**: all three places now give the recovery its condition: only when the item's row on the base records it as done and names its merged PR. Otherwise `develop-next` HALTs and deletes nothing.

**Tests**: none; it is prose, and no code decides it. `tick-pr.test.mjs` holds that `start` answers `resume` for a tick that is not on the base.

**Verify**: read the three places: `skills/develop-next/SKILL.md`, `docs/reference/configuration.md` (`developNext.tickVia`), `shared/resources/tick-pr.sh`.

## Developer Fix Cycle 2

**Date**: 2026-11-25

**Root cause**: the recovery was given to the run, which has the tick branch checked out and halts one step later, and it was stated in three places with two conditions (T320-CR-201).

**Fix**: the run deletes nothing and halts, as step 3 says. The owner settles it, and only the configuration reference (`developNext.tickVia`) says how, with the condition and the checkout. `skills/develop-next/SKILL.md` and `shared/resources/tick-pr.sh` cite it.

**Tests**: none; it is prose, and no code decides it. `tick-pr.test.mjs` holds that `start` answers `resume` for a tick that is not on the base.

**Verify**: read the reference row, and that the other two places state no recovery.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-25 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-11-25 | Reopened | qa-task | Not fixed by task.320.qa.2.task-319-leftover-findings.md |
| 2026-11-25 | Ready for QA | qa-fix | Fixed in QA cycle 2 |

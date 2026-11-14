# Bug Report: Task 308 - Docs say finalise carries a pause made during the 6c wait

**Task**: [Link](./task.308.pause-commits-cancel-the-step-7-ci-poll.md)
**Bug ID**: TASK-308-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-14

## Description

The hook comment, `develop-pipeline-hooks.md`, the CHANGELOG entry and scenario 17i say `/finalise`'s acceptance or gaps commit carries a held step-7 pause commit. A pause during the 6c CI wait comes after the acceptance push, so nothing in `/finalise` pushes it. Step 8's commit pushes it.

## Steps to Reproduce

Read the order in `skills/finalise/SKILL.md`: 6a commits and pushes, then 6c polls. A PreCompact during the poll holds its commit locally.

## Expected Behavior

The docs name the real carrier for each timing.

## Actual Behavior

They name finalise for every step-7 pause.

## Impact

Wording only; behaviour is the same as task 303's step-8 hold. A reader looking for the held commit after `/finalise` would not find it pushed.

## Recommendation

Say a pause before 6a is carried by finalise's commit and one during the 6c wait by Step 8's commit, in the hook comment, hooks.md, CHANGELOG and the 17i comment.

## Developer Fix Cycle

### Iteration 1

**Root cause**: the carrier of a held step-7 pause was described as finalise's commit for every timing.

**Fix**: reworded to name both carriers in the hook comment, stderr and signal text, scenario 17h/17i comments, `develop-pipeline-hooks.md`, `develop-pipeline-pause.md` (which still said the hold was step 8 only) and the CHANGELOG entry; bundled copies regenerated.

**Probe**: `git grep -F -i "own commit carries"` over SKILL.md, shared resources and hand-authored references, minus generated copies, plus the changed observable (`carries the held`, `finalise's own`) over the task's files. Population: 9 sites across 6 files, all updated; `develop-pipeline-pause.md` was the one the finding did not cite. Move: patch (a wording fix at distinct sites, no shared contract to consolidate).

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-14 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |

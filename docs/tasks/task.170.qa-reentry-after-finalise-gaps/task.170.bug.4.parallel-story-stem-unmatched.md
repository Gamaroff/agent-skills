# Bug Report: Task 170 - Hybrid-numbered story directories have no stem

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute review, CR-2)
**Date Found**: 2026-10-03

## Description

Cycle 1's stem regex `story\.[0-9]+\.[0-9]+[A-Za-z]?` does not match the hybrid numbering
`create-parallel-stories` produces (`story.305.1-1.example-feature`):
`echo story.305.1-1.example-feature | sed -nE '…'` prints nothing (verified 2026-10-03), so the
script exits 2 for every parallel story — a regression from the directory-wide lookup.

## Expected Behavior

`story.305.1-1` is the stem; the re-entry works for parallel stories.

## Actual Behavior

`reenter-qa: '…' is not a task.{id}.* or story.{epic}.{story}.* work-item directory`, exit 2.

## Recommendation

Accept an optional `-N` parallel suffix (and the sub-story letter); add a suite case for a `story.E.S-P.*` directory.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-03

**Fix Description**: the stem regex accepts an optional `-N` parallel suffix before the optional sub-story letter.

**Files Modified**: `shared/resources/reenter-qa-after-finalise.sh`; suite case "a hybrid-numbered parallel story (story.305.1-1) re-enters".

**Testing**: 40/40; dropping the `(-[0-9]+)?` group turns the case red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 2            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 2        |
| 2026-10-03 | Closed       | QA         | Verified in QA cycle 3         |

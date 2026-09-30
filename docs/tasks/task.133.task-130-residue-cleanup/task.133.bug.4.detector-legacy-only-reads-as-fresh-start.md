# Bug Report: Task 133 - a legacy-only candidate set is reported as a fresh start

**Task**: [task.133.task-130-residue-cleanup.md](./task.133.task-130-residue-cleanup.md)
**Bug ID**: TASK-133-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2, refute pass CR-3)
**Date Found**: 2026-09-30

## Description

Phase 3's legacy rule drops a candidate that has no `task_or_story_directory`. The prompt's no-candidate rule (`pipeline-resume-detector-prompt.md`, the "If no lock is present and no candidate survives step 1" paragraph) then answers `source: "none"`, "treat this as a fresh start". The SKILL.md Step 0-lock paragraphs say a legacy snapshot is "a **different** state … never a fresh start". A fresh run's Step 8 then deletes the sole legacy snapshot, and the recovery window closes without anyone deciding.

## Expected Behavior

A legacy-only set gets its own outcome: a blocking issue naming `--restore --accept-legacy <doc-dir>` or deletion, so the orchestrator HALTs for the operator, as the SKILL.md text says.

## Recommendation

Extend the no-candidate rule. When the only candidates dropped were legacy, set `blocking_issues` to a legacy-specific message (not the fresh-start one) and keep `source: "none"`. Test it at a marker.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: The no-candidate rule had one outcome for "nothing on disk" and "only a legacy snapshot on disk".

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Added a marked paragraph (`<!-- candidate-rule: legacy-only -->`): a legacy-only set gets its own blocking issue naming `--restore --accept-legacy <doc-dir>` or deletion. The fresh-start sentence no longer covers it.

**Files Modified**: `shared/resources/pipeline-resume-detector-prompt.md`; `shared/resources/tests/detector-candidate-rule.test.mjs` A2

**Testing**: A2 red → green; B already proves `--restore` refuses a legacy-only set.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in cycle 2 |

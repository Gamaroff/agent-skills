# Bug Report: Task 133 - the conditional Step 0-lock restore cites a condition the in-place path cannot evaluate

**Task**: [task.133.task-130-residue-cleanup.md](./task.133.task-130-residue-cleanup.md)
**Bug ID**: TASK-133-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2, refute pass CR-2)
**Date Found**: 2026-09-30

## Description

Phase 4 made the three Step 0-lock paragraphs run `--restore` "only when resume contract § Restore the lock (both resume paths) says the restore runs here". That section opens with "When `source` is `halt_snapshot` or `orphaned_claim` and the operator chooses Resume". Both of those facts come from the detector (Step 0a) and the Phase 0b prompt. On the in-place continuation path, a session resuming after a pause or HALT, neither has happened yet. An agent reading the condition literally finds it unmet and skips the restore. Every `advance-pipeline-lock.sh <n>` then errors, and the Stop hook is inert.

## Expected Behavior

The one statement says how the in-place path evaluates it: from the snapshot's own `halt_reason` / `pause_reason`, which the bullets already key on.

## Recommendation

Add one sentence to § Restore the lock stating that the in-place continuation evaluates the same bullets from the snapshot on disk (`halt_reason` / `pause_reason`), with no detector and no prompt. Leave the citation sites conditional. Test: the statement names the in-place evaluation (marker-anchored).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: § Restore the lock phrased its condition around the detector `source` and the Resume prompt, and neither exists on the in-place path.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Added a marked paragraph (`<!-- restore: in-place -->`): on the in-place path the same bullets decide, read from the snapshot on disk (`halt_reason` / `pause_reason`, `skill`); an orphaned claim takes the second bullet; nothing on disk means nothing to restore.

**Files Modified**: `shared/resources/develop-pipeline-resume-contract.md`; `shared/resources/tests/who-restores-single-statement.test.mjs` (v)

**Testing**: (v) red → green. Probe: "continues in place" population 5, no other site restates the condition.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in cycle 2 |

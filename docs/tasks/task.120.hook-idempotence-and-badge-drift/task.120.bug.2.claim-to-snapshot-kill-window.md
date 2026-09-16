# Bug Report: Task 120 - A kill between the lock claim and the snapshot leaves the pipeline unlocked and un-resumable

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Bug ID**: TASK-120-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle-2 refute pass, strengthening cycle-1 advisory CR-3)
**Date Found**: 2026-09-16

## Description

The pre-task snapshot-before-removal guarantee ("every exit path — clean finish OR harness SIGTERM/timeout mid-flow — leaves the snapshot on disk", `develop-pipeline-pause.md` item 1) held because the lock stayed under its own name until `write_pause_snapshot` had run: a kill before that point left the lock intact, and the next fire paused normally. The atomic claim (task.120 Phase 1) renames the lock at `on-precompact.sh:99`; the snapshot is not written until `:119`. A harness kill in that window leaves neither `develop-pipeline.lock` nor `last-halt.json` — the only copy of pipeline state is `develop-pipeline.lock.pausing.<pid>`, which the Phase 0a resume detector never reads (it checks only the lock and `last-halt.json`, and reports a fresh start) and which the next winner's sweep at `:108` deletes. Two individually correct fixes — snapshot-before-removal and the atomic claim — combine to reopen the window the first one closed. The pause doc still states the old guarantee.

## Steps to Reproduce

1. Write a lock; run the hook with `write_pause_snapshot` stubbed to `kill -TERM $$` (or read the line order: `mv` at 99, snapshot at 119).
2. Observe: no lock, no `last-halt.json`, one `.pausing.<pid>`.
3. Run the hook again with a fresh lock: the orphaned claim is removed; its state is gone.

## Expected Behavior

Whatever the kill point, resumable state survives somewhere the resume path reads.

## Actual Behavior

State survives only under a name nothing reads, and is swept on the next pause.

## Impact

Narrow (milliseconds) but real, and the documented guarantee is now false. The implementation report remains the primary recovery tool, so a run is not lost — but the detector's "fresh start" answer is wrong.

## Recommendation

In the sweep, promote an orphaned claim to the snapshot when none exists (`[ -f "$SNAPSHOT" ] || cp stale "$SNAPSHOT"` before `rm`), so a killed run's state is recovered by the next pause instead of deleted; reword `develop-pipeline-pause.md` item 1 to name the claim-to-snapshot window and what covers it; add a test: a stale claim with no snapshot present → the snapshot afterwards carries the stale claim's `current_step`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-16
**Developer**: qa-fix (develop-task pipeline, cycle 2)

**Root Cause**: The claim (`mv` at `:99`) precedes `write_pause_snapshot` (`:119`); a kill in between leaves the state only under `develop-pipeline.lock.pausing.<pid>`. The resume detector read only the lock and `last-halt.json`. A first attempt — promoting a stale claim to the snapshot inside the sweep — was rejected on inspection: the sweep runs only after a *new* lock has been claimed, and that run's own snapshot overwrites the promotion moments later, so it recovers nothing.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-16

**Fix Description**:
- `shared/resources/pipeline-resume-detector-prompt.md` (bundled into 9 skills): Step 1 gains a third fallback — when neither the lock nor `last-halt.json` exists, read the newest `develop-pipeline.lock.pausing.*` as the lock (it is the lock renamed), set `source: "orphaned_claim"`, surface it as an interrupted pause. The `source` enum documents the new value.
- `shared/resources/develop-pipeline-on-precompact.sh`: sweep unchanged in behaviour (delete), comment now states why deleting there is safe (a newer lock was just claimed) and points at the detector's fallback.
- `shared/resources/develop-pipeline-pause.md`: item 1 no longer claims "every exit path" — it names the claim-to-snapshot window and how the detector covers it; item 0 cross-references.

**Files Modified**:
- `shared/resources/pipeline-resume-detector-prompt.md`
- `shared/resources/develop-pipeline-on-precompact.sh` (comment)
- `shared/resources/develop-pipeline-pause.md`
- `shared/resources/develop-pipeline-on-precompact.test.sh` — Scenario 15

**Testing**:
- Scenario 15: a shim `rm` parks the hook inside the window (the sweep routes through `rm` when a stale claim exists); the test `kill -9`s it there and asserts lock absent, snapshot absent, exactly one orphaned claim carrying the lock's full state (`current_step`, `tracker_issue`) — the property the detector's fallback depends on. 15/15.
- mutation-proven: claim by `cp` instead of `mv` → scenario 15 red ("the hook had claimed the lock before being killed") plus 5 others → **covered**

**Verification Steps for QA**:
1. Read `pipeline-resume-detector-prompt.md` Step 1 — three fallbacks, `orphaned_claim` in the `source` enum.
2. Run scenario 15 alone; confirm the surviving `.pausing.*` file parses as the lock.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-16 | New | QA Engineer | Filed from QA cycle 2 refute pass (strengthened cycle-1 CR-3) |
| 2026-09-16 | In Progress | qa-fix | Investigation — promotion-in-sweep rejected as ineffective |
| 2026-09-16 | Ready for QA | qa-fix | Resume detector reads the orphaned claim; pause.md names the window; scenario 15 |

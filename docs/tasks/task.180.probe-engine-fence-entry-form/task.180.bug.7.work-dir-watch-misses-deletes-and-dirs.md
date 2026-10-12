# Bug Report: Task 180 - the work-dir write watch misses deletions and empty directories

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (QA cycle 4 safety re-probe, code review CR-2 / TASK-180-013)
**Date Found**: 2026-10-12

## Description

The cycle-3 work-dir watch around each `fence:` spawn reports only paths that exist after the run and differ. Two kinds of change go unreported:

- **A deletion.** The watch never looks for a path that was there before and is gone. `rm ../.probe-harness/bin/gh` removes the gh trip-wire, and later cases then resolve the host's real `gh` through the sandbox PATH.
- **An empty directory.** `snapshotTree` records regular files only, so `mkdir ../pwned` beside the case directory is invisible.

## Steps to Reproduce

A block `: "<slot>"`, with legitimate input `$(rm -f ../.probe-harness/bin/gh; mkdir ../pwned-dir)`: `escapes` is `[]`.

## Expected Behavior

Both are recorded as escapes under `work/`.

## Recommendation

Compare the two snapshots both ways (a path present before and absent after is an escape). Include directory entries in the stamp map. Add a test that deletes the trip-wire from an input.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New    | QA Engineer | QA cycle 4 — reproduced on 1a31af72 |

# Bug Report: Task 180 - the work-dir write watch misses deletions and empty directories

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
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

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 4

**Root cause**: The watch iterated only the after-snapshot, and `snapshotTree` records regular files only.

**Fix**: `workDirStamps` adds every directory (keyed `path/`, stamped `dir`, since a directory's mtime moves with its contents) to `snapshotTree`'s file stamps, and `runFenceCase` compares both ways: a path that appeared or changed, and a path that is gone. `snapshotTree` itself (shared with `qa-execute-snippets.mjs`) is unchanged.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md`.

**Testing**: New test: input `$(rm -f ../.probe-harness/bin/gh; mkdir ../pwned-dir)` records `work/.probe-harness/bin/gh` and `work/pwned-dir/` as escapes. Mutations (deletions unseen; directories unseen) → each red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 4 — reproduced on 1a31af72 |
| 2026-10-12 | Ready for QA | qa-fix      | Watch compares both ways, directories included; mutation-proven |
| 2026-10-12 | Closed       | QA Engineer | QA cycle 5 — verified on f21c0552; regression test and 2 QA mutations red |

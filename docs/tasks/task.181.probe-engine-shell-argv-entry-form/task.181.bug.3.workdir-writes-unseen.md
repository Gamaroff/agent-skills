# Bug Report: Task 181 - a shell-argv: write beside the case directory is unseen

**Task**: [task.181.probe-engine-shell-argv-entry-form.md](./task.181.probe-engine-shell-argv-entry-form.md)
**Bug ID**: TASK-181-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2, code review CR-2 / TASK-181-003)
**Date Found**: 2026-10-13

## Description

The sandbox sentinel deliberately skips the work dir, and each case directory sits inside it. `runFenceCase` therefore takes a `workDirStamps` snapshot around each run and reports a write, change or deletion beside the case directory (a sibling case, `.probe-harness`, the trip-wire `gh`) as an escape (TASK-180-011, -013). `runShellArgvCase` takes none, although its inputs are paths and its cwd is the case directory: a script that writes `"$1"` with the hostile input `../pwned` writes into the work dir and nothing records it.

## Steps to Reproduce

`writes.sh` is `touch "$1"; exit 1`. `runProbeSpec({ entry: "shell-argv:writes.sh", argv: ["{input}"], cases: [hostile "../pwned", expected { exit: 1 }] })`.

## Expected Behavior

An escape at `<work-dir>/pwned`.

## Actual Behavior

`escapes: []`.

## Impact

A boundary that lets a traversal write through reads as clean on the escape axis — the sentinel's last line of containment is silent for this form.

## Recommendation

Wrap the setup and the script spawns in `runFenceCase`'s `workDirStamps(workDir, basename(caseDir))` before/after diff, ignoring the trip-wire marker, and push every changed or removed path. `cli:` has the same gap on `develop` (no `workDirStamps` in `runCliCase`) — a pre-existing follow-up, out of this task's scope.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-13 — qa-fix, QA cycle 2

**Move**: Narrowing residue (pipeline offer): the shell-argv: arm re-implemented the per-case isolation `runFenceCase` has. Move: consolidate — `caseShellEnv` and `caseWatchedSpawn` define it once for both arms.

**Fix**: The work-dir snapshot moved out of `runFenceCase` into `caseWatchedSpawn`, which both arms now call for every run (and the setup's). A write beside the case directory, a change, or a deletion in the harness is an escape for `shell-argv:` exactly as for `fence:`.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`; the setup contract in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, the engine header, `CHANGELOG.md` and the task document.

**Testing**: New test: `touch "$1"` with `../pwned` records an escape ending `/pwned`; `rm -f ../.probe-harness/bin/gh` records the deletion. Mutation (snapshot loop emptied in the shared helper) → the new test and both `fence:` work-dir tests (TASK-180-011, -013) red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-13 | New | qa-task | Found in QA cycle 2 (refute pass) |
| 2026-10-13 | Ready for QA | qa-fix | Fix iteration 1 |

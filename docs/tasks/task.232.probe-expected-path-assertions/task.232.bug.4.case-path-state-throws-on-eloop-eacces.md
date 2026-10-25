# Bug Report: Task 232 - `casePathState` throws on a symlink loop or an unreadable ancestor

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1; diff review CR-3, measured by QA)
**Date Found**: 2026-10-25

## Description

`casePathState` (`shared/resources/security-probe.mjs:1216`) maps `ENOENT` and `ENOTDIR` to `missing` and rethrows every other `lstat` error. A probed script controls what it leaves in the case directory. If it leaves a symlink loop or a `chmod 000` directory above an asserted path, `lstatSync` throws `ELOOP` or `EACCES`, and the error leaves `compareExpected`.

The old `existsSync` never threw, so this is new in the change.

## Steps to Reproduce

`compareExpected({exit:0, absent:["loop/x"]}, run, dir)` with `dir/loop -> loop`, and `absent:["locked/x"]` with `dir/locked` at mode 000. The scratch script `t232-eloop.mjs` does both.

| Engine | loop | locked |
| --- | --- | --- |
| head | throws `ELOOP` | throws `EACCES` |
| base (`origin/develop`) | returns a result | returns a result |

## Expected Behavior

One case's unreadable path is scored or recorded as that case's mismatch or error. The probe does not crash.

## Actual Behavior

The error propagates. The diff review reports that `runProbeSpec` wraps the case loop only in `try/finally`, so the whole probe run ends on the throw.

## Impact

A hostile fixture can abort a probe run that would otherwise have produced a verdict. It is loud, not silent, which is why the severity is MEDIUM.

## Recommendation

Map any other `lstat` error to a reported state rather than throwing. For example, return `"unreadable"`, which `compareExpected` and `scoreFenceRun` report as a mismatch (`<path> could not be read (<code>)`). Add a test that plants each of `ELOOP` and `EACCES` and asserts a mismatch, not a throw.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

`casePathState` rethrew any lstat error other than ENOENT/ENOTDIR. The run controls the case directory, so a loop or a mode-000 directory it leaves crashed `runProbeSpec`.

#### Fix Implementation

`casePathState` returns `{ state }`; any other lstat failure is `{ state: "unreadable", code }`. `compareExpected` reports `<path> could not be read (<code>)`; the fence scorer counts it as a side effect (not `missing`).

**Files modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`

**Testing**: New test: a symlink loop gives `loop/x could not be read (ELOOP)` for absent and removed; a mode-000 ancestor gives EACCES (skipped under root). Red (throws) on the pre-fix engine.

## Status History

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-10-25 | New | Found in QA cycle 1 |
| 2026-10-25 | Ready for QA | qa-fix cycle 1 |

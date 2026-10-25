# Bug Report: Task 232 - A run that leaves a mode-000 directory crashes the probe's sandbox teardown

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2; diff review CR-1, reproduced by QA)
**Date Found**: 2026-10-25

## Description

Cycle 1 (QA1-4) made `casePathState` report an unreadable path as a mismatch instead of throwing. It also wrote into `probe-boundary-rule.md` §5 and the CHANGELOG that a path the run left unreadable is "a mismatch too, never a probe crash".

That holds for `compareExpected`, but not for the runner. `runProbeSpec` removes its sandbox in a `finally` block with `rmSync(sandboxRoot, { recursive: true, force: true })` (`shared/resources/security-probe.mjs:1948`). When a case leaves a mode-000 directory behind, `rmSync` cannot list it and throws EACCES. The probe ends and every case result is lost.

## Steps to Reproduce

A fence entry whose block runs the slot, and one hostile case with input `mkdir -p locked && chmod 000 locked` and `expected: { exit: 0, stdout: "ok\n", absent: ["pwned"] }`, passed to `runProbeSpec`. The scratch script was `t232-qa2-repro.mjs`.

## Expected Behavior

`runProbeSpec` returns the case's result, and the sandbox is removed.

## Actual Behavior

`runProbeSpec` throws `EACCES, Permission denied: /tmp/security-probe-…`, and the sandbox is left on disk.

On base (`origin/develop`) the teardown is the same and throws the same way. The crash is not new, but the documented claim is.

## Impact

A hostile input can stop the probe from reporting anything, so a probe run against a script that chmods is unrecordable. The rule doc tells case authors it cannot happen.

## Recommendation

Before removing the sandbox, walk it with `lstat` (never following symlinks) and give every directory owner `rwx`, then remove it. Add a `runProbeSpec`-level test whose case leaves a mode-000 directory and still returns its results, and confirm it is red without the fix.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

`runProbeSpec` removed its sandbox with a plain recursive `rmSync`, which cannot list a mode-000 directory a case leaves behind; it threw EACCES out of the `finally` and the results were lost.

#### Fix Implementation

New `removeSandbox(root)`: on EACCES/EPERM it walks the sandbox with `lstat` (never following a symlink out), gives every directory owner rwx, and retries the removal.

**Files modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`

**Testing**: New runner-level test: a fence case that leaves a mode-000 directory returns one rejected row per shell (skipped under root). Red with the plain `rmSync` restored (F1).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-25 | New | qa-task | Found in QA cycle 2 |
| 2026-10-25 | Ready for QA | qa-fix | qa-fix cycle 2 |

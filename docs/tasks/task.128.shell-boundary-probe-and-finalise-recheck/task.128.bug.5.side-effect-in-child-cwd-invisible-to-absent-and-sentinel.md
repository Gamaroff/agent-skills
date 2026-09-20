# Bug Report: Task 128 - a side effect a script writes to its cwd is invisible to both `absent` and the escape sentinel

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-2 refute review CR-1, reproduced)
**Date Found**: 2026-09-20

## Description
`runShellCase` spawns the script with `cwd: workDir` but checks `expected.absent` against `fixtureDir`, and `snapshotTree(sandboxRoot, workDirName)` deliberately skips `workDir`. A script that re-parses a name without first `cd "$1"` — the `qa-cycle.sh` shape, which globs `"$DIR"/*` from wherever it is — runs `$(touch PWNED)` in `workDir`, where nothing looks: the case scores `rejected` and the verdict can read `engages`. The only fixture exercising `absent` (`eval-names.sh`) begins with `cd "$1"`, which is exactly the shape that hides this.

## Steps to Reproduce
A no-`cd` variant of `eval-names.sh` (`for f in "$1"/*; do eval ": $(basename "$f")"; done; printf '12\n'`) run via `shell:` → `command-substitution` outcome `rejected`, `escapes: 0`.

## Expected Behavior
The substitution is caught wherever it lands: the script's cwd is the fixture directory (so `absent` sees it), or `absent` is checked against both.

## Actual Behavior
`PWNED` is created in `workDir`; nothing reports it.

## Impact
The `absent` check — the only signal for the command-substitution cases — is defeated by the most common script shape.

## Recommendation
Spawn with `cwd: fixtureDir`; add the no-`cd` fixture to the tests so the substitution is caught where a non-cd script lands it.

## Developer Fix Cycle

### Iteration 1
**Root cause**: the child's cwd was `workDir`; `absent` looked in `fixtureDir`; the sentinel skips `workDir`.
**Fix**: `spawnSync(…, { cwd: fixtureDir })` — a relative side effect now lands where `absent` looks. Fixture `eval-names-nocd.sh` (no `cd "$1"`) added; test `a side effect a no-cd script writes to its cwd is caught by absent (BUG-5)` asserts both substitution cases are reproduced under both shells.
**Mutation proof**: cwd reverted to `workDir` → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | cwd: fixtureDir + no-cd fixture |
| 2026-09-20 | Closed | QA Engineer | Verified fixed at cycle 3 (execution) |

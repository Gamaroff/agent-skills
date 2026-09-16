# Bug Report: Task 110 - A timed-out command keeps running after the verifier reports timeout

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

`defaultRunner` spawns `bash -c 'command <argv>'`. On timeout `spawnSync` kills only the bash
wrapper; when bash forks rather than exec-ing the command (macOS `/bin/bash` 3.2 keeps the child under
it — the reviewer verified both shells), the whitelisted command — e.g. a ten-minute `npm test` — is
orphaned and keeps running, and writing, after the verifier has reported `unverifiable: timeout`.
(CR-6.)

## Expected Behavior

`timeout` means the command is no longer running.

## Actual Behavior

The wrapper is dead, the command lives on.

## Impact

Resource leak on every read-mode run with slow rows — which is the normal case at the default 60 s.

## Recommendation

Spawn `detached: true` and kill the process group on timeout (`process.kill(-pid)`), or run the argv
directly without the bash wrapper so the killed process is the command itself.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: `spawnSync("bash", ["-c", …])` — the timeout killed the wrapper, and bash 3.2 forks rather than execs, so the command survived.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: the argv is spawned directly (no shell — which also removes the quoting surface and the need for a `command ` prefix), `detached: true` puts it in its own process group, and on `ETIMEDOUT` the verifier kills the group with `process.kill(-pid, "SIGKILL")`.

**Files Modified**: `skills/session-handoff/scripts/handoff-verify.mjs`, `skills/session-handoff/tests/handoff-verify.test.js`.

**Testing**: the CR-6 test spawns a script that forks a sleeping grandchild and records its pid; after `--timeout 3` the test asserts the grandchild is dead. Mutation-proved: removing the group kill turns that test red. 5/5 stable in isolation and in the full suite.

**Verification Steps for QA**: run read mode with `--timeout 3` over the live handoff, then `pgrep -f 'npm (run|test)'` — nothing from this repo remains.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | CR-6 |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Direct spawn, detached, group kill on timeout |
| 2026-09-15 | Closed | QA Engineer | Verified in QA cycle 2 (gate 2): shape refused / behaviour proved; corpus 0/73 hostile accepted |

# Bug Report: Task 110 - An interrupted verifier orphans the detached child

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

The cycle-1 fix for bug.3 spawns the command `detached: true` so a timeout can kill the process group. The side effect (CR-7): the child is in its own session, so Ctrl-C on the verifier no longer reaches it, and because `spawnSync` blocks the event loop no JS signal handler can run to kill the group until the child exits. An operator who interrupts read mode during `npm test` leaves the suite running.

## Expected Behavior

Interrupting the verifier ends the command it was running.

## Recommendation

Async spawn (await the `close` event) so SIGINT/SIGTERM handlers can `process.kill(-pid, "SIGKILL")` the group before re-raising; keep the timeout group kill.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 2)

**Root Cause**: `spawnSync` blocks the event loop; a detached child is outside the terminal's foreground group.

**Fix**: the runner is now `spawn` + promise (`verify()` and `run()` are async); the CLI installs SIGINT/SIGTERM handlers that kill the active child's process group (`activeChild.pid`) and then exit 130/143. Timeout still kills the group.

**Testing**: CR-7 test spawns the CLI over a script that forks a grandchild, waits for the grandchild's pid, sends SIGINT to the CLI, asserts exit 130 and the grandchild dead. Mutation-proved: removing the handler's kill turns it red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | CR-7 |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Async runner + signal-driven group kill |
| 2026-09-15 | Closed | QA Engineer | Verified in QA cycle 3 (gate 3) |

# Bug Report: Task 172 - The checkCommand timeout kills only sh -c

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-26
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: /finalise DoD security agent (and, for BUG-26, the Step 5c PR review as CR-1); reproduced by the agent and re-run by the orchestrator
**Date Found**: 2026-10-01

## Description

The engine runs ``ci.docsOnly.checkCommand`` as ``spawnSync("sh", ["-c", cmd], {timeout, killSignal: "SIGKILL"})``. On timeout Node kills only the ``sh`` pid, so a check such as ``npm run ci:fast && npm run eval:all`` leaves its child processes running after the engine reports ``check-failed``. The orphans hold the inherited stderr open: a caller capturing ``$(node … 2>&1)`` blocked 23 s on a 1 s timeout, and the leaked suite kept running against the working tree.

## Expected Behavior

After the timeout (or any end of the check) no process the check started is still running.

## Actual Behavior

See the description.

## Impact

Fails closed (no wrong green) but leaks a test suite in the working tree and lets a foreground reading outlive the tool timeout the 570 s setting is meant to stay under.

## Recommendation

Run the check as the leader of its own process group and kill the group.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (post-DoD fix, outside a numbered QA cycle)

Reproduced before the fix: `spawnSync` with `sleep 24` standing in for the check returned ETIMEDOUT after about 1 s and `pgrep` still showed the `sleep` (DoD security agent), as did a real run in a temp repo.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

The check is spawned with `detached: true` (so `sh` leads a process group) and `killProcessGroup(pid)` sends SIGKILL to `-pid` after the call returns, on every end, ignoring ESRCH, a missing pid (a fake `spawn`) and Windows. Test `SEC-1` runs `sleep 30 & echo $! > file; wait` with `checkTimeoutSeconds: 1` and asserts the recorded child is dead; removing the group kill turns it red.

## Status History

| Date       | Status       | Changed By | Notes                                  |
| ---------- | ------------ | ---------- | -------------------------------------- |
| 2026-10-01 | New          | finalise   | Found by the DoD security gate         |
| 2026-10-01 | In Progress  | develop    | Investigation started                  |
| 2026-10-01 | Ready for QA | develop    | Fix implemented and mutation-proven    |

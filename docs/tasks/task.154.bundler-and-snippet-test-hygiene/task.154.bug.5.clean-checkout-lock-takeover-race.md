# Bug Report: Task 154 - Stale-lock takeover in the clean-checkout runner is not atomic

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 3, code review CR-1)
**Date Found**: 2026-09-29

## Description

Suppose two runs find the same dead owner's PID in `<dir>.lock`. Each runs `rm -rf "$LOCK"` and then
`take_lock`. The second run's `rm` can delete the lock the first run has just acquired. Both runs then
hold the location, both `rm -rf` and clone into the same directory, and each run's `EXIT` trap deletes
the other's clone and lock. This is the cycle-2 concurrency defect (bug 4), reached through the
takeover path.

## Expected Behavior

At most one run ever holds a location.

## Recommendation

A run must never share a location with another. See the structural note in QA report 3: the lock,
the marker and the takeover all protect a location that two runs can both name.

## Developer Fix Cycle

### Iteration 1

**Move (qa-fix Step 2.6, repeat subject): replace the mechanism.** Every runner finding from
cycle 1 on had one subject: deleting a location that another party can also name. The marker, the
lock and the lock's takeover each protected that shared location a little further, and each one
brought its own edge cases.

The runner now clones into a directory it creates itself with `mktemp -d` inside the base
(`CLEAN_CHECKOUT_DIR`, default `<repo>/.clean-checkout`). Its trap removes that directory and
nothing else. No other run and no other tool can name a directory `mktemp` has just created, so the
design needs no lock, no marker, no takeover and no ownership check. The base itself is never
deleted.

The base check keeps these refusals:

- a path containing a control character
- an ephemeral location, in both spellings
- a path whose parent is missing (it creates at most the base itself)
- a path that is not a directory
- a directory it cannot write to

**Files**: `scripts/test-clean-checkout.sh` (rewritten), `tests/test-clean-checkout.test.js`,
`.gitignore` (lock entry dropped), `CHANGELOG.md`.

**Tests**: 11/11. Two of them cover this bug directly:

- A **concurrency** case starts two runs at once on one base. Each holds its clone for a second and
  checks that the clone is still there. Both exit 0, and the base is empty afterwards.
- A **never deletes** case runs with the repo, `.`, the parent and a foreign directory as the base.
  The foreign directory holds someone else's `run.keep`. After each run, every base is exactly as it
  was.

**Mutation-proven**: each change below turned the named test red.

| Mutation | Test that went red |
| --- | --- |
| H1: a shared fixed location with `rm -rf` at start | the concurrency test |
| H2: the trap also deletes the base | the never-deletes test |
| H3: the missing-parent refusal turned off | the refusal test |
| H4: the writability check turned off | the refusal test |

**Spec note**: the task's Target Architecture (§3) describes `${CLEAN_CHECKOUT_DIR}` as the clone
location that is "removed at start and on exit". It is now the base that holds each run's own
directory. The intent is unchanged: the location is configurable, repo-local and never temporary. The
deletion semantics changed.

## Status History

| Date       | Status       | Changed By | Notes                     |
| ---------- | ------------ | ---------- | ------------------------- |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 3       |
| 2026-09-29 | Ready for QA | qa-fix     | Fixed by replacing the shared location (cycle 3) |

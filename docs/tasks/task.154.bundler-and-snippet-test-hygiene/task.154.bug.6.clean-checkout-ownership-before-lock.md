# Bug Report: Task 154 - A location held by a live run is reported as "not created by this script, remove it by hand"

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 3, code review CR-2)
**Date Found**: 2026-09-29

## Description

The ownership decision (existence, marker, emptiness) runs before the lock check. Consider a live run
that is inside `git clone`, so its directory is non-empty and the marker is not yet written. Or
consider one whose `EXIT` trap has already removed the marker. A second run is then refused with
"was not created by this script … remove it by hand", not "another run is using it". The message
tells the operator to delete a live run's directory.

## Expected Behavior

A location that a live run holds is always reported as held.

## Recommendation

As bug 5: a location that no two runs can share removes the need for this ordering.

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
| 2026-09-29 | Closed       | qa-task    | Verified in QA cycle 4: no shared location remains |

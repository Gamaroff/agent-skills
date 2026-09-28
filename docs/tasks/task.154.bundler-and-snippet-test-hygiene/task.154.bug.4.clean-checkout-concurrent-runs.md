# Bug Report: Task 154 - Two concurrent clean-checkout runs delete each other's clone

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 2, refute pass CR-2; confirmed by reading `scripts/test-clean-checkout.sh`)
**Date Found**: 2026-09-29

## Description

The `.git/` marker proves that some run of the script created the directory. It does not prove that
the run has finished. Suppose a second invocation starts on the same location while the first is
still running, for example `release.sh` alongside an agent run on the default `<repo>/.clean-checkout`.
The second run passes the ownership check and `rm -rf`s the first run's clone in the middle of its
test. The first run's `EXIT` trap later deletes the second run's clone.

## Expected Behavior

The runner holds the location exclusively for the whole run. It refuses with exit 2 while a live owner
holds it, and it takes over a location whose owner has died.

## Recommendation

Use an atomic lock held for the whole run, such as `mkdir` of a sibling lock directory recording the
owner PID. Check a lock found on entry with `kill -0`. The `EXIT` trap removes only a lock this run
holds. Add a fixture case that holds the lock with a live PID and asserts exit 2 with the clone
untouched.

## Developer Fix Cycle

### Iteration 1

**Fix**: The runner holds `<dir>.lock` for the whole run. It creates the lock with `mkdir`,
which is atomic, and records its PID inside. When it meets an existing lock, it reacts to the owner:

| Lock state | Outcome |
| --- | --- |
| Owner is alive (`kill -0` succeeds) | Refused with exit 2. That run's clone and lock are left untouched. |
| Owner is dead | The lock is taken over. |
| Lock holds no numeric pid | Refused as not this script's lock. |

The `EXIT` trap removes the clone and the lock, and it is set only after the lock is held.

**Tests**: A live-PID lock (the test's own process) is refused, and the clone and lock survive. A
dead-PID lock is taken over and released. A foreign lock directory is refused and left intact.
`.clean-checkout.lock/` is gitignored.

**Mutation-proven**: G3 turned off the live-owner check, and the live-lock test went red.

**Known residue**: in the gap between `mkdir` and the PID write, a racing second run reads an empty
pid and refuses. It exits 2 and deletes nothing.

## Status History

| Date       | Status       | Changed By | Notes                     |
| ---------- | ------------ | ---------- | ------------------------- |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 2       |
| 2026-09-29 | Ready for QA | qa-fix     | Fix implemented (cycle 2) |
| 2026-09-29 | Closed       | qa-task    | Closed for the live-owner case; the takeover race is bug 5 |

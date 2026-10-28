# Bug Report: Task 238 - The base run has no timeout and strands its worktree when killed

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR-1)
**Date Found**: 2026-10-28

## Description

`shared/resources/fast-gate-outcome.sh:83` runs the failing test files at the PR base with no time
bound: `(cd "$WT" && command node --test "${FILES[@]}") >"$BASE_LOG" 2>&1`. The script's only
cleanup is `trap 'rm -rf "$WORK"' EXIT` (line 63). The base worktree is removed only on the normal
path (line 85).

A head test that hangs at the base blocks the classifier until its caller kills it. The kill skips
line 85, so `.worktrees/base-check-$$` stays on disk and stays registered with git, together with
its `node_modules` symlink.

## Steps to Reproduce

Reproduced 2026-10-28 with the scratch script `repro-cr1.sh`, which is not committed:

1. Create a fixture repository whose `origin/develop` holds `t.test.mjs` with a test that never settles.
2. Write a red gate log that names `t.test.mjs`.
3. Run `timeout 5 bash fast-gate-outcome.sh --log <log> --exit 1 --base develop`.

Observed: `classifier rc=124`, `stranded worktrees: base-check-555952`, and `git worktree list` showing 2
entries. Whether the base `node` child outlives the kill was **not** established: the `pgrep -f`
count matched its own shell.

## Expected Behavior

The base run is bounded. A timeout reads `BASE_CHECK=unavailable` → `GATE_OUTCOME=attributable`, and
the base worktree is removed on every exit path, killed or not.

## Actual Behavior

The classifier has no bound of its own. When killed, it leaves a registered worktree behind. The next
cycle's `git worktree add` then uses a new `$$`, so the stale worktrees accumulate.

## Impact

The script runs only on a red fast gate, inside the QA loop and develop-bug's verify loop. A
stranded worktree pollutes the checkout, where `git status` stays clean only because `.worktrees`
is ignored. A hang also stalls the loop step until the tool timeout.

## Recommendation

- Run the base `node --test` under `timeout` (process-group kill, e.g. `timeout -k 5 <N>` with
  `setsid` where available).
- Treat exit 124/137/143 as `unavailable`.
- Move the worktree removal into the EXIT trap.
- Add a test that a base hang yields `attributable` within the bound, with no `.worktrees/` entry left.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The base `node --test` ran in the foreground with no bound. The worktree was removed
on one line after it, so any exit that skipped that line skipped the removal. The EXIT trap knew only
`$WORK`. A foreground child also holds off a trapped signal until it returns, so even a trap could
not have run.

The repro killed the classifier only, and it did not establish whether `node` survives. The fix
answers that question by test rather than by assumption.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`):

- **The base run is bounded.**
  - It runs as a background job under `set -m`, so it leads its own process group. A watchdog
    sleeps `FAST_GATE_BASE_TIMEOUT` seconds (default 90, which fits a 120 s foreground tool call),
    marks the timeout, then sends TERM and later KILL to the **whole group**. That group includes the
    test-file processes `node --test` spawns.
  - On a timeout the script prints `BASE_CHECK=unavailable (the base run did not finish within Ns)`
    and `GATE_OUTCOME=attributable`.
  - A bound that is not a positive integer is a usage exit (2).
- **Every exit path cleans up.**
  - The EXIT trap now kills the watchdog's and the base run's groups and removes and prunes the
    worktree, as well as `$WORK`.
  - TERM, INT and HUP exit through it. While the base runs the script sits in `wait`, which a
    trapped signal interrupts at once.
- **SIGKILL runs no trap**, so before adding its own worktree, a run removes any
  `.worktrees/base-check-<pid>` whose pid is no longer alive.
- The watchdog job is disowned, so its kill draws no "Killed" notice on stderr.

**Files Modified**:

- `shared/resources/fast-gate-outcome.sh` (and its bundled copies)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the bound is added to the list of shapes
  that land on *attributable*
- `CHANGELOG.md`
- `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`, with four new assertions:
  - A hanging base test with a bound of 2 s gives `attributable` within 20 s, an empty stderr, no
    worktree, and the hanging test's own pid dead.
  - A classifier sent SIGTERM mid-run exits 143, leaves no worktree, and its base test pid is dead.
  - A stale worktree named for a dead pid is swept by the next run.
  - A `FAST_GATE_BASE_TIMEOUT` of `0`, `abc` or `-5` exits 2.

**Testing**:

- **Red before**: all four new assertions are red on the `908d3713` script. The hang test hit its
  30 s spawn limit.
- **Green after**: 26/26.
- **Mutations** (each restored from a snapshot):

  | Mutation | Tests turned red |
  | --- | --- |
  | Drop `set -m` | Both hang tests |
  | Drop the TERM trap | The killed-mid-run test |
  | Drop the sweep | The sweep test |

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 2 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 2 fix) |

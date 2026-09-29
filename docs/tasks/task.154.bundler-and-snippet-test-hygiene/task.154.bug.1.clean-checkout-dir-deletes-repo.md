# Bug Report: Task 154 - The clean-checkout runner deletes whatever `CLEAN_CHECKOUT_DIR` names, including the repository

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Bug ID**: TASK-154-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 1, by-hand probe)
**Date Found**: 2026-09-29

## Description

`scripts/test-clean-checkout.sh` runs `rm -rf "$DIR"` before cloning and again from its `EXIT` trap.
`DIR` comes from `CLEAN_CHECKOUT_DIR` when that variable is set. The only guard refuses temporary
directories, so any other path is deleted without a check: the repository itself, an ancestor of it,
or an unrelated non-empty directory.

## Steps to Reproduce

This was probed by hand, per `probe-boundary-rule.md` §5.1: the env-var arm is a declined sink that no
engine entry form reaches. Each run used a scratch fixture repo with `node_modules/`, `env -i` with a
throwaway `HOME`, and `CLEAN_CHECKOUT_CMD=true`.

| `CLEAN_CHECKOUT_DIR` | rc | Result |
| --- | --- | --- |
| the repo itself (absolute) | 128 | **repo deleted, `.git` included** |
| the repo's parent directory | 128 | **parent and repo deleted** |
| an unrelated non-empty directory | 0 | **its contents deleted**, run reports success |
| a relative path (`sub`) | 0 | the clone is **left behind**, because the trap's relative `rm -rf` runs after `cd "$DIR"` |
| `.` | 1 | `rm` refuses `.`; the repo survives by luck, not by design |

## Expected Behavior

The runner deletes only a directory it created. It refuses a location that is the repository, contains
the repository, or already exists without the runner's marker. It resolves `DIR` to an absolute path
before it does anything.

## Actual Behavior

The runner deletes the named path without condition, and it treats relative paths inconsistently.

## Impact

Data loss. The failure takes one mistaken export of a variable the script documents as settable, for
example `CLEAN_CHECKOUT_DIR=.` or `CLEAN_CHECKOUT_DIR=$PWD`. `scripts/release.sh` now calls this
runner.

## Recommendation

Resolve `DIR` to an absolute path first. Then refuse when `DIR` equals `$REPO`, when `$REPO` lies
under `DIR`, or when `DIR` exists but carries no marker file the runner wrote. Write the marker right
after the clone. Test each of these refusals in `tests/test-clean-checkout.test.js`, and include the
relative-path case.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root Cause**: The runner trusted `CLEAN_CHECKOUT_DIR` in full. Its only guard was a hand copy of three
temp-dir patterns, applied to the path as written. Two consequences followed. Every `rm -rf` ran on a
path nothing had checked for ownership. The `EXIT` trap ran after `cd "$DIR"`, so a relative `DIR` was
resolved against the clone itself.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- The runner now resolves `DIR` to an absolute path with no symlinks, through its nearest existing
  ancestor, before anything reads or deletes it.
- It refuses with exit 2, deleting nothing, in four cases:
  - the resolved path, or the path as given, is ephemeral. The runner asks
    `observation-log.js`'s own `ephemeralReason()` rather than a copy of its patterns (CR-2). It checks
    both spellings because macOS resolves `/var/tmp` to `/private/var/tmp`, which the engine does not
    list.
  - `DIR` is `/`.
  - `DIR` is the repository or contains it.
  - `DIR` exists, is non-empty, and carries no `.git/test-clean-checkout.marker`.
- The runner writes that marker into the clone's `.git/` straight after cloning, so a later run can
  replace a clone left behind by an interrupted run. Because the marker sits in `.git/`, `git status`
  never shows it.
- `DIR` is now absolute, so the `EXIT` trap removes the same directory after `cd` as it would before.

**Files Modified**: `scripts/test-clean-checkout.sh`, `tests/test-clean-checkout.test.js`, `CHANGELOG.md`

**Testing**: Three new fixture tests. The first refuses the repo, `.`, the parent, `/` and a foreign
directory, and asserts afterwards that `.git` and the foreign file both survive. The second refuses a
symlink that points into `/tmp`. The third accepts a leftover marked clone, an empty directory and a
relative path, and checks that nothing is left behind. Mutation-proven: F1 (containment), F2
(marker), F3 (as-given spelling), F4 (unresolved `DIR`). Each turned its named test red.

**Verification Steps for QA**: Repeat the cycle-1 by-hand probe table against the fixed runner. Every
row should now be refused (exit 2) or leave nothing behind.

## Status History

| Date       | Status       | Changed By | Notes                    |
| ---------- | ------------ | ---------- | ------------------------ |
| 2026-09-29 | New          | qa-task    | Found in QA cycle 1      |
| 2026-09-29 | In Progress  | qa-fix     | Investigation started    |
| 2026-09-29 | Ready for QA | qa-fix     | Fix implemented (cycle 1) |
| 2026-09-29 | Closed       | qa-task    | Verified in QA cycle 2    |

---
id: task.263.plan
title: "Implementation Plan: Untrusted-content bound: unresolvable parent and lint test headroom"
type: plan
task-ref: task.263.untrusted-content-bound-parent-and-test-headroom.md
---

# Implementation Plan: Untrusted-content bound: unresolvable parent and lint test headroom

> Requirements and success criteria: [task.263.untrusted-content-bound-parent-and-test-headroom.md](task.263.untrusted-content-bound-parent-and-test-headroom.md)

## Overview

Write the new named-guard cases first and watch them go red, then replace the "skip when `REAL_DIR` is empty" branch in the three block sources with a walk to the nearest existing ancestor, then measure the lint test and cut its repeated tree load.

## Phase-by-Phase Implementation Guide

### Phase 1: Named-guard tests first

**Files to modify:**

- `tests/untrusted-content-rule.test.js` — add cases inside the existing scratch-repo section (the part after the `if (site !== BOUND_SITES[0]) continue;` line, so they run at the first site only).

**Exact changes:**

- Extend `scratchRepo()` (the helper at about line 419) with the fixtures the new cases need, each created with `fs`: `docs/dangling` as a symlink to a path that does not exist, `docs/locked` as a directory with mode 000, and a regular file `docs/file.md`. `docs/link` (a symlink to `../outside`) already exists there.
- Cases, each asserting its own message with `assert.match(r.stdout, …)` and `r.status` (task 262's convention: the test names the guard that fires):
  - `docs/dangling/x.md` → status 1, `/has a parent that cannot be resolved/`
  - `docs/dangling/sub/x.md` → the same
  - `docs/locked/x.md` → the same; wrap in `{ skip: process.getuid?.() === 0 }` and say why in the test name. Restore the mode in `finally` before `fs.rmSync`, or the cleanup fails.
  - `docs/link/new/x.md` → status 1, `/resolves outside docs\/ and the PRD root/` (the control: a missing child under a symlink that leaves the tree)
  - `docs/file.md/x.md` → the same as the dangling case (a regular file used as a directory; stated as a behaviour change in the task, § 3)
  - the existing "parent directory does not exist is kept" case stays as it is and must stay green.
- Run `CI=true node --test tests/untrusted-content-rule.test.js` and confirm the four HALT cases fail against the current block. If any is green, the case is not testing the new guard; fix the case.

### Phase 2: The block

**Files to modify:** the three sources named in the task. Edit each with the Edit tool, one hunk per call.

**Exact changes:** replace the `REAL_DIR=` line's follow-up `if [ -n "$REAL_DIR" ]` guard with the block below. The first `REAL_DIR=` line and the in-root comparison are unchanged; only the middle is new. This was run in a scratch tree under both `bash` and `zsh` while writing the task (see the table in the task's § 3); the results were: `docs/dangling/x.md`, `docs/dangling/sub/x.md`, `docs/locked/x.md` and `docs/file.md/x.md` HALT as unresolvable, `docs/link/new/x.md` HALTs as outside, and `docs/ok/x.md`, `docs/missing/x.md`, `docs/missing/deep/x.md` and a repo with no `docs/` are kept.

```bash
  REAL_DIR=$(cd "$(dirname "$LOCAL_PATH")" 2>/dev/null && pwd -P) || REAL_DIR=""
  if [ -z "$REAL_DIR" ]; then
    # The parent did not resolve. Judge the nearest ancestor that exists as a name.
    ANC=$(dirname "$LOCAL_PATH")
    while [ "$ANC" != "." ] && [ "$ANC" != "/" ] && [ ! -e "$ANC" ] && [ ! -L "$ANC" ]; do ANC=$(dirname "$ANC"); done
    case "$ANC" in
      .|/) ;;   # nothing on the chain exists: the read fails with its own error
      *) REAL_DIR=$(cd "$ANC" 2>/dev/null && pwd -P) || { echo "HALT: derived path $LOCAL_PATH has a parent that cannot be resolved"; exit 1; } ;;
    esac
  fi
  if [ -n "$REAL_DIR" ]; then
    # ... the existing in-root comparison, unchanged ...
  fi
```

- Update the one sentence above the block so it says: a missing directory is not an error, but a link that does not resolve, or a directory that cannot be entered, is.
- Run `npm run bundle`, then `npm run bundle:check`. Never edit the bundled copies.

**Do not** reorder the earlier guards. The outside-root string guard, the `..` guard and the symlinked-file guard run before this code and are not touched.

### Phase 3: Lint test headroom

**Files to modify:** `tests/untrusted-content-rule.test.js`.

**Exact changes:**

1. Measure before changing anything. Record the per-test durations with `CI=true node --test --test-reporter=spec tests/untrusted-content-rule.test.js` and the total from the plain run, three times.
2. Memoise `loadTree()` (line 141): compute once at module level on first use and return the same object. The three callers (lines 168, 180, 196) only read it, so sharing is safe; check that none of them mutates the object, and if one does, copy there.
3. Re-measure. If `duration_ms` is above 1500 on any of three runs, take the next step: the hostile-path loop (the `[path, expected message]` table, about line 385) starts one shell per row; run all rows for one site in a single shell and split the output, keeping one assertion per row so a failure still names the row.
4. Stop when three consecutive runs are at or below 1500 ms. Do not remove or merge any test. The "the path bound is the same block at every site" test must still be there.

Record the three figures and the command in the QA report, not the implementation report (the criterion's location).

### Phase 4: Record

- Add a `CHANGELOG.md` entry under `[Unreleased]` that cites `(task 263)`, in the style of the task 262 entry (`CHANGELOG.md:9` at the time of writing).

## Key Patterns and References

- Task 262's conventions: a hostile case names the guard that fires; the scratch-repo cases run at the first site only; every fix is mutation-proved (revert the behaviour, name the test that goes red).
- Root-user skips: `tests/test-clean-checkout.test.js:437` and `tests/test-tmpdir.test.js:360` branch on `process.getuid`.
- Edit only the three sources; `npm run bundle` regenerates the six copies.

## Testing Approach

- New cases: Phase 1 list. Control cases: a missing child under a real `docs/` subdirectory (kept) and under `docs/link` (HALT).
- Mutation proofs for the QA report: delete the unresolvable-parent HALT (the dangling and locked cases go red); delete the in-root comparison for the ancestor (the `docs/link/new/x.md` case goes red).
- Timing: Phase 3's three runs.

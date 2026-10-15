---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-15'
related: 'task 203'
description: 'The `post-check-failed` revert command does not undo the run, and can destroy unrelated work'
---

# Bug Report: Task 203 - The `post-check-failed` revert command does not undo the run, and can destroy unrelated work

**Bug ID**: TASK-203-BUG-2
**Related**: [task.203.migrate-doc-numbering.md](./task.203.migrate-doc-numbering.md) (QA finding CR-2, gate 1)
**Status**: ✅ Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: The `post-check-failed` revert command does not undo the run, and can destroy unrelated work.

**Expected Behavior**: The `revert:` text undoes exactly what the run did and nothing else.

**Actual Behavior**: It reads `git checkout -- . && git clean -fd <root>`. `git mv` stages the renames, and `checkout -- .` restores from the index, so every move stays. It also discards unrelated uncommitted edits repo-wide, and `git clean -fd <root>` deletes untracked files the run moved with a plain rename, plus any other untracked work under the root. The same text sits in the nothing-to-move branch.

**Impact**: The one moment the run tells an operator how to recover is the moment it is wrong. Following it loses work.

---

## Reproduction Steps

**Environment**: Linux, Node 26, `feature/task.203.migrate-doc-numbering` at `7ac5e445`.

**Steps to Reproduce**:

1. Run `--apply`, then follow the printed revert. `git status` still shows every `R` rename.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Related Files**: `shared/resources/migrate-doc-numbering.mjs:1415 (and the nothing-to-move branch's `revert:`)`

---

## Success Criteria Violation

**Reference**: § 11 Rollback Plan — "Uncommitted: `git checkout -- . && git clean -fd docs/prd`" (the task's own text carries the same defect).

**How It Failed**: It reads `git checkout -- . && git clean -fd <root>`. `git mv` stages the renames, and `checkout -- .` restores from the index, so every move stays. It also discards unrelated uncommitted edits repo-wide, and `git clean -fd <root>` deletes untracked files the run moved with a plain rename, plus any other untracked work under the root. The same text sits in the nothing-to-move branch.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root Cause Analysis**: `git mv` stages the renames, and `git checkout -- .` restores from the index, so the hint undid nothing. `git clean -fd <root>` also deleted untracked work and the run's untracked moves. During the fix the new round-trip test found a third gap: a registry the run created is untracked, so no restore removes it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: New exported `revertHint(root, touched, untrackedMoves, created)`. It runs `git restore --source=HEAD --staged --worktree -- <root> <each edited path outside the root>` (no-overlay, so a staged rename destination is removed and its source returns), plus an exact `rm -f` of each file the run created. It names untracked moved files for moving back by hand. It is printed on `ok` too, as how to undo before committing. The crashed-apply branch names the epic registry only when it exists. The task's Rollback Plan (§ 10, § 11) now says the same.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`, `task.203.migrate-doc-numbering.md`

**Testing**: New test `CR-2: the printed revert undoes an uncommitted --apply exactly, in a real git repository`: after apply, running `.revert` returns `git status` to just the pre-existing untracked file. It is mutation-proven, with the created-file `rm` disabled. The full engine suite has 38/38 passing.

**Verification Steps for QA**: Run `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, then re-run the reproduction above.


### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 2)

**QA Reopening Reason**: gate 2, CR-1. The iteration-1 hint restored the whole PRD root and every touched outside file, while `verify()` refused only dirty move sources, so running it could erase uncommitted work the run never touched.

**Revised Approach** (Step 2.6 — a repeat subject, so the move is **consolidate**, not another patch): one exported `touchRecord(planned, edits, writes, io, tracked)` — moves, in-place rewrites, created files — is now the single record that the dirty check, `apply()` and the revert all read.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**:
- `dirty-path` now covers every tracked path the run would change, not only a move source.
- `revertHint(touch, progress?)` lists exactly the moved, edited and written paths (never a directory). It runs from the repository top level (`cd "$(git rev-parse --show-toplevel)"`, which also closes CR-7).
- The nothing-to-move branch prints no command.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`, `task.203.migrate-doc-numbering.md` (§ 10 Rollback, blocker table), `task.203.plan.migrate-doc-numbering.md`

**Testing**: The new test `cycle 2 CR-1: a dirty file the run would rewrite in place blocks` passes. So does `cycle 2 CR-1/CR-7: the revert touches only the run's own paths, keeps unrelated dirty work, and runs from a subdirectory`, a real git repository with an uncommitted edit under the root that survives the revert. Mutation-proven three ways: in-place dirty check off, root re-added to the restore, top-level `cd` removed. The suite passes 44/44.
---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-10-15 | New    | qa-task    | Bug created |
| 2026-10-15 | In Progress | qa-fix | Investigation started |
| 2026-10-15 | Ready for QA | qa-fix | Fix implemented (QA cycle 1) |
| 2026-10-15 | Reopened | qa-task | Not fixed by task.203.qa.2.migrate-doc-numbering.md — the hint restores the whole root, erasing uncommitted work the run never touched (cycle 2 CR-1) |
| 2026-10-15 | In Progress | qa-fix | Re-investigation (cycle 2) |
| 2026-10-15 | Ready for QA | qa-fix | Fix implemented (QA cycle 2) |
| 2026-10-15 | Closed | qa-task | Verified by task.203.qa.3.migrate-doc-numbering.md |

---

## Resolution Summary

[Filled when closed]

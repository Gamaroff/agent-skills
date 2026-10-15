---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-15'
related: 'task 203'
description: 'A failure inside `apply()` throws with no payload and no revert hint, and can leave a directory split'
---

# Bug Report: Task 203 - A failure inside `apply()` throws with no payload and no revert hint, and can leave a directory split

**Bug ID**: TASK-203-BUG-6
**Related**: [task.203.migrate-doc-numbering.md](./task.203.migrate-doc-numbering.md) (QA finding CR-3 (cycle 2), gate 2)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2)

---

## Bug Description

**Summary**: A failure inside `apply()` throws with no payload and no revert hint, and can leave a directory split.

**Expected Behavior**: An error part-way through the moves or writes returns `post-check-failed` with a revert hint built from what was already done.

**Actual Behavior**: `apply()` is not wrapped. A `git mv` refusal or a write `EACCES` part-way through throws out of `run()` / `main()` with no payload. Moves are made one file at a time, so a document directory can be left split between its old and new location, and a re-run then answers `blocked`, with no revert hint.

**Impact**: The one failure the task's § 10 High Risk 3 names ("a crash midway through `--apply`") ends with no recovery instruction.

---

## Reproduction Steps

**Environment**: Linux, Node 26, `feature/task.203.migrate-doc-numbering` at `b210c0bb`.

**Steps to Reproduce**:

1. In memory: an io whose `move()` throws on its third call → `run --apply` throws, and no payload is returned.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Related Files**: `shared/resources/migrate-doc-numbering.mjs:1560 (`const done = apply(planned, disc, e.edits, io, { writes, tracked });`)`

---

## Success Criteria Violation

**Reference**: § 10 High Risk 3 (a partial apply); § 3 exit contract `post-check-failed` ("the report says how to revert").

**How It Failed**: `apply()` is not wrapped. A `git mv` refusal or a write `EACCES` part-way through throws out of `run()` / `main()` with no payload. Moves are made one file at a time, so a document directory can be left split between its old and new location, and a re-run then answers `blocked`, with no revert hint.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 2)

**Root Cause Analysis**: `apply()` was called with no try/catch, and recorded nothing about its progress.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: `apply()` now records its progress (`moved`, `written`). `run()` wraps it, and on any error returns `post-check-failed` with `error`, the counts, and `revertHint(touch, progress)`, which covers only what was actually done. `apply()` also removes only the ancestors of moved files (CR-4), never any other empty directory.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`

**Testing**: New tests `cycle 2 CR-3: a move that fails part-way returns post-check-failed with a revert for what was done` and `cycle 2 CR-4: apply only asks to remove ancestors of moved files`. Mutation-proven: try/catch removed → red; progress ignored → red; old directory sweep restored → red. The full engine suite has 44/44 passing.

---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-10-15 | New    | qa-task    | Bug created |
| 2026-10-15 | In Progress | qa-fix | Investigation started |
| 2026-10-15 | Ready for QA | qa-fix | Fix implemented (QA cycle 2) |

---

## Resolution Summary

[Filled when closed]

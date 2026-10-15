---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-15'
related: 'task 203'
description: 'Two stories that map to one new id pass the dry run and fail only after the moves'
---

# Bug Report: Task 203 - Two stories that map to one new id pass the dry run and fail only after the moves

**Bug ID**: TASK-203-BUG-5
**Related**: [task.203.migrate-doc-numbering.md](./task.203.migrate-doc-numbering.md) (QA finding CR-2 (cycle 2), gate 2)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2)

---

## Bug Description

**Summary**: Two stories that map to one new id pass the dry run and fail only after the moves.

**Expected Behavior**: A story whose new id `story.P.E.S` is already held under the target epic, by another migrating story or an already-numbered one, is a blocker in the dry run and under `--check`.

**Actual Behavior**: Stories keep their number under the new parent with no collision check. Epics get one through `kept` / `nextE`, but stories do not. The dry run answers `dry-run`, and `--apply` moves every file before `checkCorpus` reports `duplicate-id`.

**Impact**: A partially-migrated tree, the case the task names, produces a half-applied run that only a revert can recover.

---

## Reproduction Steps

**Environment**: Linux, Node 26, `feature/task.203.migrate-doc-numbering` at `b210c0bb`.

**Steps to Reproduce**:

1. In memory: a legacy epic `epic.1.e` holding `story.1.1.a` (legacy) and `story.1.1.1.b` (already numbered). `run --root` → `dry-run`, then `run --apply` → `post-check-failed ["duplicate-id"]`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Related Files**: `shared/resources/migrate-doc-numbering.mjs:532 (`story: s.story,` in plan())`

---

## Success Criteria Violation

**Reference**: § 3 "none writes until all have passed"; § 4 "Already-numbered documents are left alone" (a partially migrated tree).

**How It Failed**: Stories keep their number under the new parent with no collision check. Epics get one through `kept` / `nextE`, but stories do not. The dry run answers `dry-run`, and `--apply` moves every file before `checkCorpus` reports `duplicate-id`.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 2)

**Root Cause Analysis**: Stories keep their number under the new parent, and `plan()` checked no collision; epics are numbered from `kept`/`nextE`, stories were not.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: `plan()` now groups every planned epic and story by its new id and raises a new `id-collision` blocker when two would carry one, provided at least one of them is renamed. The code is added to `BLOCKER_CODES`, the header, the task's blocker table and the plan.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`

**Testing**: New test `cycle 2 CR-2: two stories that would carry one id block the dry run` (dry run and `--apply` both answer `blocked`, nothing moved). Mutation-proven: check disabled → red. The full engine suite has 44/44 passing.

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

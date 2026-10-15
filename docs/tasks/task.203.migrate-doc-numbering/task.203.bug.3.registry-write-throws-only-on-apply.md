---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-15'
related: 'task 203'
description: 'A PRD-registry row that cannot be written crashes `--apply` after a clean dry run'
---

# Bug Report: Task 203 - A PRD-registry row that cannot be written crashes `--apply` after a clean dry run

**Bug ID**: TASK-203-BUG-3
**Related**: [task.203.migrate-doc-numbering.md](./task.203.migrate-doc-numbering.md) (QA finding CR-3, gate 1)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: A PRD-registry row that cannot be written crashes `--apply` after a clean dry run.

**Expected Behavior**: Every refusal `appendPrdRow` can raise is reported as a blocker by the dry run and by `--check`, before anything is written.

**Actual Behavior**: `appendPrdRow` throws `no-table` (a header using a selector alias such as `| # | Name |`, which `next()` accepts), `bad-row` (a `created:` holding `|`) or `duplicate-row`. It is called only on the `--apply` path, after the moves and outside any try, so a clean dry run is followed by an uncaught exception, with the tree already half-written.

**Impact**: This is the partial-apply risk § 10 says is mitigated by "all verification happens before the first write". Here it is not.

---

## Reproduction Steps

**Environment**: Linux, Node 26, `feature/task.203.migrate-doc-numbering` at `7ac5e445`.

**Steps to Reproduce**:

1. A registry whose header is `| # | Name | Folder | Status | Created |` with one legacy PRD: the dry run answers `dry-run`, and `--apply` throws `appendPrdRow: no PRD table header`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Related Files**: `shared/resources/migrate-doc-numbering.mjs:1382 (`reg = docId.appendPrdRow(reg, {`)`

---

## Success Criteria Violation

**Reference**: § 3 "none writes until all have passed"; § 10 High Risk 3 (a partial apply).

**How It Failed**: `appendPrdRow` throws `no-table` (a header using a selector alias such as `| # | Name |`, which `next()` accepts), `bad-row` (a `created:` holding `|`) or `duplicate-row`. It is called only on the `--apply` path, after the moves and outside any try, so a clean dry run is followed by an uncaught exception, with the tree already half-written.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root Cause Analysis**: `appendPrdRow` ran only on the `--apply` path, after the moves and outside any try.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: New exported `planRegistry(planned, registryText, edits, io, registryPath)`. It builds the registry text before any write, in the dry run and `--check` too, and turns every `appendPrdRow` refusal into a `registry-unwritable` blocker. It starts from the link pass's rewrite of an in-tree registry, which fixes the advisory CR-4, and the edit map entry is dropped so the file is written once. `registry-unwritable` is added to `BLOCKER_CODES`, the header and the task's blocker table.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`, `task.203.migrate-doc-numbering.md`

**Testing**: New tests: `CR-3: a registry appendPrdRow would refuse blocks the dry run and --apply, before any write` (alias header, `blocked`, nothing written) and `CR-4: the registry row is layered on the link pass's rewrite of an in-tree registry`. Both are mutation-proven. The full engine suite has 38/38 passing.

**Verification Steps for QA**: Run `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, then re-run the reproduction above.

---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-10-15 | New    | qa-task    | Bug created |
| 2026-10-15 | In Progress | qa-fix | Investigation started |
| 2026-10-15 | Ready for QA | qa-fix | Fix implemented (QA cycle 1) |

---

## Resolution Summary

[Filled when closed]

---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-15'
related: 'task 203'
description: 'A named L3 monolith is planned but never moved; the run answers `already`'
---

# Bug Report: Task 203 - A named L3 monolith is planned but never moved; the run answers `already`

**Bug ID**: TASK-203-BUG-1
**Related**: [task.203.migrate-doc-numbering.md](./task.203.migrate-doc-numbering.md) (QA finding CR-1, gate 1)
**Status**: ✅ Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: A named L3 monolith is planned but never moved; the run answers `already`.

**Expected Behavior**: With `--name docs/prd.md=<slug>`, the monolith is migrated to `${PRD_ROOT}/<slug>/prd.1.<slug>/prd.1.<slug>.md`.

**Actual Behavior**: `discover()` adds the monolith to `prds` but not to `disc.files`, so `plan()` builds no `fileMap` entry for it. `run()` takes the `fileMap.size === 0` branch and answers `already`, while the mapping still lists the move.

**Impact**: A consumer with an L3 monolith is told there is nothing to migrate. Their PRD is never numbered, and the success criterion that L3 shapes are read does not hold.

---

## Reproduction Steps

**Environment**: Linux, Node 26, `feature/task.203.migrate-doc-numbering` at `7ac5e445`.

**Steps to Reproduce**:

1. In memory: files `docs/prd.md` and `docs/prd/.keep`; `run(["--root","docs/prd","--name","docs/prd.md=mono"])` → `already {"prds":1,"files":0}` with mapping `docs/prd.md → docs/prd/mono/prd.1.mono/prd.1.mono.md`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Related Files**: `shared/resources/migrate-doc-numbering.mjs:622 (`for (const f of disc.files)`)`

---

## Success Criteria Violation

**Reference**: § 4 In Scope — "Reading all three legacy PRD shapes (L1, L2, L3)"; Phase 1 unit-test criterion for L3.

**How It Failed**: `discover()` adds the monolith to `prds` but not to `disc.files`, so `plan()` builds no `fileMap` entry for it. `run()` takes the `fileMap.size === 0` branch and answers `already`, while the mapping still lists the move.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-15
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root Cause Analysis**: `discover()` puts the L3 monolith (beside the root) in `prds` but not in `disc.files`. `plan()` built `fileMap` from `disc.files` only, so the monolith's explicit move never reached it. A second gap appeared during the fix: `planEdits` skipped any file outside the root whose text does not name the root, which skipped the monolith's frontmatter edit.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-15

**Fix Description**: `fileMap` is now built from `disc.files` plus every `explicit` key, and the redundant L3 branch is collapsed (CR-6). The out-of-tree prefilter now never skips a file that has a frontmatter or gate edit.

**Files Modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`

**Testing**: New test `CR-1: a named L3 monolith beside the root is moved, not reported as already`: `--apply` answers `ok`, the file is at `docs/prd/mono/prd.1.mono/prd.1.mono.md` with `prd_number: 1`, and the registry holds row 1. It is mutation-proven twice, once with each half reverted. The full engine suite has 38/38 passing.

**Verification Steps for QA**: Run `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`, then re-run the reproduction above.

---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-10-15 | New    | qa-task    | Bug created |
| 2026-10-15 | In Progress | qa-fix | Investigation started |
| 2026-10-15 | Ready for QA | qa-fix | Fix implemented (QA cycle 1) |
| 2026-10-15 | Closed | qa-task | Verified by task.203.qa.2.migrate-doc-numbering.md |

---

## Resolution Summary

[Filled when closed]

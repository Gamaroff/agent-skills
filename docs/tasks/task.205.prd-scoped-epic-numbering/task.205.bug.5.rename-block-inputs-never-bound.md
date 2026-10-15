---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'The sync-github-epic rename and edit blocks never bind their inputs'
---

# Bug Report: Task 205 - The sync-github-epic rename and edit blocks never bind their inputs

**Bug ID**: TASK-205-BUG-5
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-3, gate 2)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2, refute pass)

---

## Bug Description

**Summary**: The sync-github-epic rename and edit blocks never bind their inputs.

**Actual Behavior**: The rename block guards `ISSUE_NUM`, `EPIC_ID`, `EPIC_TITLE`, `MILESTONE_TITLE` but assigns none of them, so a real run stops at the guard; the edit block reads the same names unbound.

## Location

`skills/sync-github-epic/SKILL.md:193`

## Recommendation

Re-derive the values in each block from `EPIC_FILE_PATH`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The rename and edit blocks guarded names bound in Step 3.
**Fix Description**: Both blocks take only `EPIC_FILE_PATH` and derive `ISSUE_NUM`, `EPIC_ID`, `EPIC_TITLE`, `MILESTONE_TITLE` from `doc-id.js epic-meta`.
**Testing**: The guard test runs the rename block with only `EPIC_FILE_PATH` set; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 2 refute pass (CR-3) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |

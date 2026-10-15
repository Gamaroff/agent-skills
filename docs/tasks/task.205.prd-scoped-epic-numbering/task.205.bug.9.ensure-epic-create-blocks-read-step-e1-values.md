---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'ensure-epic-github-issue's milestone and create blocks read values bound in Step E1'
---

# Bug Report: Task 205 - ensure-epic-github-issue's milestone and create blocks read values bound in Step E1

**Bug ID**: TASK-205-BUG-9
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-2, gate 3)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 3)

---

## Bug Description

**Summary**: ensure-epic-github-issue's milestone and create blocks read values bound in Step E1.

**Actual Behavior**: `EPIC_ID`, `EPIC_TITLE`, `MILESTONE_TITLE` are bound only in Step E1; in their own shell the issue is created as `[Epic ] ` on an empty milestone.

## Location

`skills/ensure-epic-github-issue/SKILL.md:147`

## Recommendation

Re-derive them with `doc-id.js epic-meta` in each block, as sync-github-epic's edit block does.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The milestone and create blocks read values bound in Step E1.
**Fix Description**: Both blocks derive `EPIC_ID`, `EPIC_TITLE`, `MILESTONE_TITLE` with `doc-id.js epic-meta` from `EPIC_FILE_PATH`.
**Testing**: The guard test runs both blocks with empty values in the env and a recording tracker stub; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 3 (CR-2) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 3 fix pass |

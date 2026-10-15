---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'The create-epic card preflight block reads PRD_DIR, P and E from another block'
---

# Bug Report: Task 205 - The create-epic card preflight block reads PRD_DIR, P and E from another block

**Bug ID**: TASK-205-BUG-8
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-1, gate 3)
**Status**: Closed
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 3)

---

## Bug Description

**Summary**: The create-epic card preflight block reads PRD_DIR, P and E from another block.

**Actual Behavior**: Run in its own shell, the path is `/epics/epic...[name]/…` and `card-preflight.js` exits 2 (`no such file`). Measured; base's line fails the same way with `PRD_ROOT` unbound. Reviewer severity HIGH, re-rated MEDIUM on that measurement (advisory step, loud failure).

## Location

`skills/create-epic/SKILL.md:386`

## Recommendation

Use the `{epic file}` placeholder the id-check block uses.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The preflight line was rewritten with shell variables bound in Discover Parent PRD.
**Fix Description**: The line takes a substituted `{epic file}` and reads no shell variable.
**Testing**: A test asserts the block reads no variable; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 3 (CR-1) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 3 fix pass |
| 2026-10-15 | Closed | qa-task | Verified by task.205.qa.4.prd-scoped-epic-numbering.md |

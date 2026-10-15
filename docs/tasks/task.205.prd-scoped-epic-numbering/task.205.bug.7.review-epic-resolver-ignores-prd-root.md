---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'review-epic''s resolver ignores a configured PRD root'
---

# Bug Report: Task 205 - review-epic's resolver ignores a configured PRD root

**Bug ID**: TASK-205-BUG-7
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-5, gate 2)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2, refute pass)

---

## Bug Description

**Summary**: review-epic's resolver ignores a configured PRD root.

**Actual Behavior**: TASK-205-BUG-2's fix was applied only to ensure-task; the review-epic Input Resolution block still defaults `PRD_ROOT` to `docs/prd`, so a configured root finds no epics.

## Location

`skills/review-epic/SKILL.md:84`

## Recommendation

Source `resolve-paths.sh` in the block, and list every added block that reads `PRD_ROOT`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The review-epic block defaulted `PRD_ROOT`.
**Fix Description**: The block sources `resolve-paths.sh`; so do the create-epic and create-epics-from-shards blocks (population: every block this task added that reads `PRD_ROOT`).
**Testing**: A `specs/prd` fixture resolves with a misleading `PRD_ROOT=docs/prd` in the env; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 2 refute pass (CR-5) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |

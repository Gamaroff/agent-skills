---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'The task milestone block parses the epic title with its own sed'
---

# Bug Report: Task 205 - The task milestone block parses the epic title with its own sed

**Bug ID**: TASK-205-BUG-4
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-2, gate 2)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2, refute pass)

---

## Bug Description

**Summary**: The task milestone block parses the epic title with its own sed.

**Actual Behavior**: A sed that strips only double quotes reads the title; the epic id blocks use `doc-id.js` `frontmatterField`. A single-quoted title gives the task a milestone key that differs from the epic's own, and a second milestone is created.

## Location

`skills/ensure-task-github-issue/SKILL.md:78`

## Recommendation

Use `frontmatterField` so all three sites share one parser.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The block parsed the epic title with its own sed.
**Fix Description**: The milestone key comes from `doc-id.js epic-meta` — the same command the epic sub-routines call.
**Testing**: A single-quoted `'Checkout: v2'` title yields `Epic 1.4 — Checkout: v2`; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 2 refute pass (CR-2) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |

---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'The shards batch presence check accepts an epic file the id check skipped'
---

# Bug Report: Task 205 - The shards batch presence check accepts an epic file the id check skipped

**Bug ID**: TASK-205-BUG-12
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-1, gate 5)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 5)

---

## Bug Description

**Summary**: The shards batch presence check accepts an epic file the id check skipped.

**Actual Behavior**: The id check only runs on a file named after its directory, while the presence test matches any `epic.P.E.*/epic.P.E.*.md`. A batch epic written as `epic.2.3.foo/epic.2.3.bar.md` is never checked and the block reports success at exit 0.

## Location

`skills/create-epics-from-shards/SKILL.md:397`

## Recommendation

Require each batch epic as `epic.P.E.{slug}/epic.P.E.{slug}.md` (exactly one), so every batch epic is one the id check read.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The presence loop matched any `epic.P.E.*/epic.P.E.*.md`, a wider shape than the one the id-check loop reads.
**Fix Description**: Each batch epic must be exactly one `epic.P.E.{slug}/epic.P.E.{slug}.md` — the shape the id check reads.
**Testing**: A misnamed batch file (`epic.2.2.foo/epic.2.2.bar.md`) is refused in the test; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 5 (CR-1) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 5 fix pass |

---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Trivial'
priority: 'Low'
created: '2026-10-15'
related: 'task 205'
description: 'The shards id check sends its reason to /dev/null'
---

# Bug Report: Task 205 - The shards id check sends its reason to /dev/null

**Bug ID**: TASK-205-BUG-13
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-4, gate 5)
**Status**: Ready for QA
**Priority**: Low
**Severity**: Trivial
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 5)

---

## Bug Description

**Summary**: The shards id check sends its reason to /dev/null.

**Actual Behavior**: The prose promises the `reason` verbatim on a HALT; the block discards the JSON and prints only the path.

## Location

`skills/create-epics-from-shards/SKILL.md:398`

## Recommendation

Print the check's output on failure.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The check's JSON was redirected to /dev/null.
**Fix Description**: The output is captured and printed on failure.
**Testing**: A failing check's output carries `"reason"` in the test; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 5 (CR-4) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 5 fix pass |

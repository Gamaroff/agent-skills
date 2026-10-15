---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: 'The create-epics-from-shards Step 7 guard validates E0 and count joined'
---

# Bug Report: Task 205 - The create-epics-from-shards Step 7 guard validates E0 and count joined

**Bug ID**: TASK-205-BUG-11
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-5, gate 4)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 4)

---

## Bug Description

**Summary**: The create-epics-from-shards Step 7 guard validates E0 and count joined.

**Actual Behavior**: `case "$E0$COUNT"` passes when only one is substituted; the batch loop then checks nothing and the block reports success at exit 0.

## Location

`skills/create-epics-from-shards/SKILL.md:388`

## Recommendation

Validate E0 and COUNT separately as positive integers, COUNT ≥ 1.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The guard tested `"$E0$COUNT"` as one string.
**Fix Description**: Each input is validated on its own as a positive integer; P is parsed with `doc-id.js parse`.
**Testing**: Partial substitutions (E0 only, count only, count 0) are refused in the test; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 4 (CR-5) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 4 fix pass |

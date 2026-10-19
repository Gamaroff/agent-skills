---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-10-15'
related: 'task 205'
description: '--rename-from creates a second milestone when the lookup fails'
---

# Bug Report: Task 205 - --rename-from creates a second milestone when the lookup fails

**Bug ID**: TASK-205-BUG-6
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-4, gate 2)
**Status**: Closed
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2, refute pass)

---

## Bug Description

**Summary**: --rename-from creates a second milestone when the lookup fails.

**Actual Behavior**: A failed milestone listing reads the same as 'old title absent', so the call creates the new milestone; every later sync then answers `already`, and the old milestone and its stories are stranded.

## Location

`shared/resources/tracker-issue.js:1027`

## Recommendation

With `--rename-from` set, a failed lookup returns `unverifiable` and creates nothing.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The milestone lookup's catch reset to 'not found' and fell through to create.
**Fix Description**: With `--rename-from`, a failed lookup returns `unverifiable` and calls nothing; without it, behaviour is unchanged.
**Testing**: `tracker-issue.test.mjs` §11 — failed lookup → unverifiable, zero writes; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 2 refute pass (CR-4) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |
| 2026-10-15 | Closed | qa-task | Verified by task.205.qa.3.prd-scoped-epic-numbering.md |

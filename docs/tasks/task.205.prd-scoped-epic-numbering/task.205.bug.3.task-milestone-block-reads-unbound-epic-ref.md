---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-15'
related: 'task 205'
description: 'The task milestone block reads an unbound $EPIC_REF'
---

# Bug Report: Task 205 - The task milestone block reads an unbound $EPIC_REF

**Bug ID**: TASK-205-BUG-3
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-1, gate 2)
**Status**: Ready for QA
**Priority**: High
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2, refute pass)

---

## Bug Description

**Summary**: The task milestone block reads an unbound $EPIC_REF.

**Actual Behavior**: The Step T3 block reads `$EPIC_REF`, which nothing in the block assigns. Run as shipped (each fenced block is its own shell), it is empty, `WANT` is empty, and every epic-linked task gets `Technical Tasks (standalone)` at exit 0.

## Location

`skills/ensure-task-github-issue/SKILL.md:67`

## Recommendation

Read `epic:` from the task file's own frontmatter inside the block; guard the task file path with `${…:?}`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: The block declared `EPIC_REF` as an input bound elsewhere.
**Fix Description**: The block takes only `TASK_FILE_PATH` (guarded) and reads `epic:` from that file with `doc-id.js` `frontmatterField`; an `EPIC_REF` in the environment is ignored.
**Testing**: `tests/epic-numbering-retirement.test.js` — a misleading `EPIC_REF=9.9` in the env still yields `Epic 1.3 — Foo`; mutation-proven.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 2 refute pass (CR-1) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |

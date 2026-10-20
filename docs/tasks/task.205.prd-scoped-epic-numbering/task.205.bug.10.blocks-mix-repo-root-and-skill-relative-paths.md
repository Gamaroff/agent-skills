---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-15'
related: 'task 205'
description: 'Blocks call helpers from two different working directories'
---

# Bug Report: Task 205 - Blocks call helpers from two different working directories

**Bug ID**: TASK-205-BUG-10
**Related**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md) (QA finding CR-1, CR-2, gate 4)
**Status**: Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-10-15
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 4)

---

## Bug Description

**Summary**: Blocks call helpers from two different working directories.

**Actual Behavior**: The ensure-epic milestone and create blocks and the sync-github-epic edit block call `doc-id.js` as `.agents/skills/<skill>/references/…` (repository root) and `tracker-issue.js` / `gh-labels.sh` as bare `references/…` (skill directory). From either cwd one half fails; a swallowed `2>/dev/null || true` hides the milestone failure.

## Location

`skills/ensure-epic-github-issue/SKILL.md:95, skills/sync-github-epic/SKILL.md:250`

## Recommendation

Resolve every helper in a block from the repository root; assert that no block this task touched mixes the two roots.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-15
**Root Cause**: Blocks made self-binding in cycles 2–3 called doc-id from the repository root while keeping their existing bare `references/` calls.
**Fix Description**: Every block in the epic skills that uses the repository-root form now uses it for every helper (ensure-epic milestone and create blocks, sync-github-epic edit block); the milestone call reports a failure instead of discarding it.
**Testing**: A new test scans every bash block in nine epic skills and fails on a block mixing the two roots (non-vacuity floor: ≥10 root blocks); the ensure-epic block test now runs the blocks' own paths with stubs placed there. Mutation-proven on two sites.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-15 | New | qa-task | Found by QA cycle 4 (CR-1, CR-2) |
| 2026-10-15 | Ready for QA | qa-fix | Fixed in QA cycle 4 fix pass |
| 2026-10-15 | Closed | qa-task | Verified by task.205.qa.5.prd-scoped-epic-numbering.md |

---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-16'
related: 'task 206'
description: 'create-story's uniqueness check throws ENOENT for an epic's first story'
---

# Bug Report: Task 206 - create-story's uniqueness check throws ENOENT for an epic's first story

**Bug ID**: TASK-206-BUG-4
**Related**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md) (QA finding CR-5, gate 1)
**Status**: Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-16
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: create-story's uniqueness check throws ENOENT for an epic's first story.

**Expected Behavior**: The assertUniqueStoryId check passes when the epic has no `stories/` directory yet (the first story), as `doc-id next story` treats a missing directory as empty.

**Actual Behavior**: `readdirSync("{epic-directory}/stories")` throws ENOENT, because create-epic never creates `stories/`.

## Steps to Reproduce

1. Run the Step 5.1 one-liner for an epic with no stories/ directory.

## Location

`skills/create-story/SKILL.md:342`

## Recommendation

Pass an empty list when the directory is missing (existsSync), so only a real collision HALTs; move the check into an executed, tested block.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-16
**Root Cause**: readdirSync on `{epic-directory}/stories` throws when an epic has no stories yet.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16
**Fix Description**: Step 5.1 is now a self-contained fenced block: it parses the epic, lists stories/ only when it exists, and HALTs with assertUniqueStoryId's message on a collision.
**Files Modified**: `skills/create-story/SKILL.md`
**Testing**: `step-0-epic-resolution.test.mjs` create-story Step 5.1 case; mutation (no existsSync) → red

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Filed from QA cycle 1 (CR-5) |
| 2026-10-16 | In Progress | qa-fix | Investigation (QA cycle 1 fix) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed — see Developer Fix Cycle, iteration 1 |

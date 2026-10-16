---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-16'
related: 'task 206'
description: 'sync-github-story's edit block reads STORY_ID that only Step 3's block binds'
---

# Bug Report: Task 206 - sync-github-story's edit block reads STORY_ID that only Step 3's block binds

**Bug ID**: TASK-206-BUG-1
**Related**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md) (QA finding CR-1, gate 1)
**Status**: Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-16
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: sync-github-story's edit block reads STORY_ID that only Step 3's block binds.

**Expected Behavior**: The Step 5b edit block derives (or is given) the story id it puts in the title, in the same block.

**Actual Behavior**: The block reads `${STORY_ID}`, which only Step 3's separate fenced block assigns. Run as its own shell, the edit renames the live issue to `[Story ] {title}`.

## Steps to Reproduce

1. Run Step 5b's block on its own with STORY_FILE_PATH bound; STORY_ID is empty and `--title "[Story ] …"` is sent.

## Location

`skills/sync-github-story/SKILL.md:190`

## Recommendation

Re-derive STORY_ID with `doc-id.js parse` inside the Step 5b block (refuse an empty id), and pin it with an executed-block test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-16
**Root Cause**: STORY_ID was bound only in Step 3's block; Step 5b read it from another shell.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16
**Fix Description**: Step 5b's block now derives STORY_ID from STORY_FILE_PATH with doc-id parse and refuses an empty id before the edit.
**Files Modified**: `skills/sync-github-story/SKILL.md`
**Testing**: `step-0-epic-resolution.test.mjs` — every tracker block … binds it ITSELF (runs the block prefix alone); mutation (empty id) → red

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Filed from QA cycle 1 (CR-1) |
| 2026-10-16 | In Progress | qa-fix | Investigation (QA cycle 1 fix) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed — see Developer Fix Cycle, iteration 1 |
| 2026-10-16 | Closed | qa-task | Verified by task.206.qa.2.hierarchical-story-ids-in-pipeline.md |

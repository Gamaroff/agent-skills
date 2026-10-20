---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-10-16'
related: 'task 206'
description: 'Step 0a.3 auto-skip still reads CURRENT_BRANCH, which only 0a.1 binds'
---

# Bug Report: Task 206 - Step 0a.3 auto-skip still reads CURRENT_BRANCH, which only 0a.1 binds

**Bug ID**: TASK-206-BUG-5
**Related**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md) (QA finding CR-1, gate 2)
**Status**: Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-10-16
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 2 — refute pass)

---

## Bug Description

**Summary**: The cycle-1 CR-8 fix made 0a.3 derive `STORY_STEM` itself "because 0a.2's block is another shell", but the same block still reads `CURRENT_BRANCH`, bound only in 0a.1's block.

**Expected Behavior**: 0a.3 binds every value it reads (`CURRENT_BRANCH=$(git branch --show-current)`), so run as its own shell it auto-skips on the story's own branch.

**Actual Behavior**: Run alone, `CURRENT_BRANCH` is empty, the `case` never matches, and the auto-skip silently never fires. The cycle-1 test sets `CURRENT_BRANCH` itself, so it cannot see this.

## Steps to Reproduce

1. Run the 0a.3 review-story block in a fresh shell with only `DOC_FILE` bound, on branch `feature/story.1.2.3.x`.
2. `AUTO_SKIPPED` stays `false`.

## Location

`shared/resources/review-pipeline-step-0a-branch-setup.md:131` (the review-story 0a.3 `case`). The task, bug and epic 0a.3 variants read `CURRENT_BRANCH` the same way (unchanged since before this task).

## Recommendation

Bind `CURRENT_BRANCH=$(git branch --show-current)` inside the 0a.3 block(s); change the test to run the block from a real checked-out branch without setting `CURRENT_BRANCH`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-16
**Root Cause**: The cycle-1 CR-8 fix bound the one value the finding named (`STORY_STEM`) and not the block's other cross-block read (`CURRENT_BRANCH`, set in 0a.1).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16
**Fix Description**: The review-story 0a.3 block binds `CURRENT_BRANCH=$(git branch --show-current)` itself (empty on a detached HEAD → no skip). The task, bug and epic 0a.3 variants read `TASK_ID` / `BUG_PREFIX` / `EPIC_NUM` from 0a.2 as well as `CURRENT_BRANCH` — unchanged since before this task and outside the review-story scope; recorded in the task's Deferred Work.
**Files Modified**: `shared/resources/review-pipeline-step-0a-branch-setup.md`, `evals/shared/tests/step-0-epic-resolution.test.mjs`
**Testing**: the 0a.3 test now runs the block alone from a real checked-out branch (git init + checkout per case) and never sets `CURRENT_BRANCH`; mutation (bind removed) → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Filed from QA cycle 2 (CR-1) |
| 2026-10-16 | In Progress | qa-fix | Investigation (QA cycle 2 fix) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed — see Developer Fix Cycle, iteration 1 |
| 2026-10-16 | Closed | qa-task | Verified by task.206.qa.3.hierarchical-story-ids-in-pipeline.md |

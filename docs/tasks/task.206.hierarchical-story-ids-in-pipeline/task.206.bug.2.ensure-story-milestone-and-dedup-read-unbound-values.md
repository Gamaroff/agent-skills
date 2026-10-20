---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-16'
related: 'task 206'
description: 'ensure-story's milestone, create and dedup blocks read values only Step S1 binds'
---

# Bug Report: Task 206 - ensure-story's milestone, create and dedup blocks read values only Step S1 binds

**Bug ID**: TASK-206-BUG-2
**Related**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md) (QA finding CR-2, CR-3, gate 1)
**Status**: Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-16
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: ensure-story's milestone, create and dedup blocks read values only Step S1 binds.

**Expected Behavior**: Each block that uses MILESTONE_TITLE or STORY_ID binds it itself, from the story document.

**Actual Behavior**: The milestone block (line 114), the S4 create block (line 178) and the S3 dedup block (line 77) read MILESTONE_TITLE / STORY_ID set only in Step S1's block. Unbound, the issue is created with no milestone (indistinguishable from the deliberate no-epic branch), and the dedup search for `[Story ]` can link an unrelated issue on a single hit.

## Steps to Reproduce

1. Run the S3 or S4 block in a fresh shell with STORY_FILE_PATH bound.

## Location

`skills/ensure-story-github-issue/SKILL.md:178`

## Recommendation

Bind STORY_ID and the milestone (doc-id parse + epic-meta) inside each block that reads them, HALT on an empty story id before the dedup search, and test each block executed on its own.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-16
**Root Cause**: MILESTONE_TITLE and STORY_ID were bound only in Step S1's block; three later blocks read them from other shells.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16
**Fix Description**: The dedup, milestone and create blocks each derive what they read (doc-id parse; epic-meta matched to the story's (P, E)); the dedup block HALTs on an empty id before searching.
**Files Modified**: `skills/ensure-story-github-issue/SKILL.md`
**Testing**: same suite, the dedup/milestone/create prefixes run alone; mutation (milestone derivation removed) → red

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Filed from QA cycle 1 (CR-2, CR-3) |
| 2026-10-16 | In Progress | qa-fix | Investigation (QA cycle 1 fix) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed — see Developer Fix Cycle, iteration 1 |
| 2026-10-16 | Closed | qa-task | Verified by task.206.qa.2.hierarchical-story-ids-in-pipeline.md |

---
type: bug
status: ready-for-qa
severity: Major
priority: Medium
created: 2026-10-16
related: task.207
description: "backfill-story-issues.sh builds the issue title from doc-id's story number and drops the sub-story letter"
---

# Bug Report: Task 207 - backfill-story-issues.sh drops the sub-story letter from the issue title

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2, finding CR-3)
**Date Found**: 2026-10-16
**Location**: `.agents/scripts/backfill-story-issues.sh:65`

## Description

The title is built as `[Story ${STORY_P}.${STORY_E}.${STORY_S}]` from doc-id's `.prd`, `.epic` and `.story`, which drops `.sub`. Sub-story `story.1.2.3A` gets `[Story 1.2.3]` and collides with story 1.2.3 — the sub-story case this PR's `sync-jira-story` change was made to fix. The same block checks only that `doc-id.js parse` succeeded, so an epic document or a story artifact (`story.1.2.3.bug.1.x.md`) would also get a story issue (CR-6, LOW).

## Steps to Reproduce

1. `command node shared/resources/doc-id.js parse story.1.2.3A.x.md --json` → `story: 3`, `sub: "A"`.
2. The script's title is `[Story 1.2.3] …`.

## Expected Behavior

`[Story 1.2.3A] …`; anything that is not a story document is skipped.

## Actual Behavior

`[Story 1.2.3] …`; an epic or artifact file is processed as a story.

## Impact

A backfilled sub-story's issue is indistinguishable by title from its parent story's.

## Recommendation

Build the label from doc-id's `.id` minus `story.`, and skip unless `.kind == "story"` and `.artifact == null`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: the label was rebuilt from `.prd`, `.epic` and `.story`, which drops `.sub`; and only a parse failure was checked.

**Fix Description**: the label is doc-id's `.id` minus `story.` (`story.1.2.3A` → `1.2.3A`); anything whose `kind artifact` is not `story null` is skipped (CR2-6).

**Files Modified**: .agents/scripts/backfill-story-issues.sh

**Testing**: shellcheck clean. The script is an already-run, one-off maintenance script with no harness (it calls `gh`); the label and skip logic were run by hand against `story.1.2.3A.x.md` (→ `1.2.3A`), `story.1.2.3.x.md` (→ `1.2.3`), `epic.1.2.x.md` and `story.1.2.3.bug.1.x.md` (both skipped). Evidence class: dev-only.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.2 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 2 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 2 |

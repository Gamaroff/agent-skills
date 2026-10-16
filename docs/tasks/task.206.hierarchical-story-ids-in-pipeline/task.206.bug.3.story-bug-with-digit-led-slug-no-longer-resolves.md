---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-16'
related: 'task 206'
description: 'bug-doc rejects a story bug whose slug starts with a digit'
---

# Bug Report: Task 206 - bug-doc rejects a story bug whose slug starts with a digit

**Bug ID**: TASK-206-BUG-3
**Related**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md) (QA finding CR-4, gate 1)
**Status**: Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-16
**Assigned To**: dev
**QA Engineer**: qa-task (develop-task pipeline, QA cycle 1)

---

## Bug Description

**Summary**: bug-doc rejects a story bug whose slug starts with a digit.

**Expected Behavior**: `story.1.2.3.bug.1.500-error.md` resolves as a story bug of story 1.2.3, as the pre-change `.+` capture did.

**Actual Behavior**: doc-id's story grammar requires the artifact slug to start with a letter, so the file resolves as mode `unknown` — no parent, no card link. A regression this change introduced (the base regex accepted it).

## Steps to Reproduce

1. `resolveBugMode('/x/story.1.2.3.bug.1.500-error.md')` → mode `unknown`.

## Location

`shared/resources/bug-doc.js:111`

## Recommendation

Take the parent id from doc-id but read the `.bug.{n}.{slug}` remainder with the looser bug-slug rule task and general bugs use; add a digit-led-slug test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-16
**Root Cause**: doc-id's story grammar requires a letter-first slug, and the whole bug filename was parsed with it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16
**Fix Description**: A new storyBugParts() takes the story id from doc-id (everything before the first `.bug.` must be exactly a story id) and reads the `.bug.{n}.{slug}` remainder with the loose bug-slug rule; the bad-pattern warning now names story.{P}.{E}.{S}.bug.
**Files Modified**: `shared/resources/bug-doc.js`
**Testing**: `sync-jira-bug.test.js` sub-story case extended with `story.1.2.3.bug.1.500-error.md` + two refusals; mutation (letter-first remainder) → red

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Filed from QA cycle 1 (CR-4) |
| 2026-10-16 | In Progress | qa-fix | Investigation (QA cycle 1 fix) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed — see Developer Fix Cycle, iteration 1 |
| 2026-10-16 | Closed | qa-task | Verified by task.206.qa.2.hierarchical-story-ids-in-pipeline.md |

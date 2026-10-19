---
type: bug
status: closed
severity: Major
priority: Medium
created: 2026-10-16
related: task.207
description: "review-epic 0a.3 auto-skip reads variables bound in another block"
---

# Bug Report: Task 207 - review-epic 0a.3 auto-skip reads variables bound in another block

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, finding CR-1)
**Date Found**: 2026-10-16
**Location**: `shared/resources/review-pipeline-step-0a-branch-setup.md:173`

## Description

The rewritten review-epic 0a.3 block matches `feature/epic.${PRD_NUM}.${EPIC_NUM}.*` against `$CURRENT_BRANCH`, but all three are bound only in the 0a.1/0a.2 blocks. Every fenced block runs as its own shell, so the pattern collapses to `feature/epic..*` and the auto-skip never fires. The review-story 0a.3 block re-derives its ids and `CURRENT_BRANCH` for exactly this reason (task.206 QA cycle 2, CR2-1). The §4 test joins the 0a.2 and 0a.3 blocks into one script and injects `CURRENT_BRANCH`, so it cannot see this.

## Steps to Reproduce

1. Run the 0a.3 block alone with only `DOC_FILE` bound, on branch `feature/epic.1.42.payments`.

## Expected Behavior

`AUTO_SKIPPED=true`.

## Actual Behavior

`AUTO_SKIPPED` stays unset; the review re-prompts for a branch it is already on.

## Impact

The fix or guard this task delivers does not hold on the path named above.

## Recommendation

Re-derive `PRD_NUM`/`EPIC_NUM` from `DOC_FILE` through `doc-id.js` and `CURRENT_BRANCH` via `git branch --show-current` inside the 0a.3 block; change the §4 test to run each block in its own shell.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: The 0a.3 block read `PRD_NUM`, `EPIC_NUM` and `CURRENT_BRANCH` from other blocks.

**Fix Description**: Re-derive all three inside 0a.3 (`doc-id.js parse` on `DOC_FILE`; `git branch --show-current`), as review-story's 0a.3 does. §4 now runs each block alone, with only `DOC_FILE` bound, in a real git checkout on the target branch, and asserts the skip on the epic's own branch and no skip on `feature/epic.1.7.other` and `feature/epic.2.42.payments`.

**Files Modified**: shared/resources/review-pipeline-step-0a-branch-setup.md, tests/doc-id-chokepoint.test.js (+ bundled copies)

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: drop the `CURRENT_BRANCH=` line from 0a.3 → §4 0a.3 test red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.1 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
| 2026-10-16 | Closed | qa-task | Verified by task.207.qa.2.doc-numbering-enforcement-and-sweep.md |

# Bug Report: Task 135 - DOC_MOVED ignores an uncommitted edit to the task document

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1, code review CR-4 — advisory, medium confidence)
**Date Found**: 2026-09-30

## Description
`git diff --quiet "$GATE_COMMIT"..HEAD -- "$TASK_FILE"` compares two commits, so an edit to the task document still in the working tree is invisible and the skip branch can fire. The `DOC_DATE` check it replaced read the working-tree file.

## Recommendation
Compare the gate commit with the working tree: `git diff --quiet "$GATE_COMMIT" -- "$TASK_FILE"`. Add a test with an uncommitted document edit.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: `DOC_MOVED` compares the gate commit with the working tree (`git diff --quiet "$GATE_COMMIT" -- "$TASK_FILE"`). The comment now states the same-commit requirement (CR-5).

**Files Modified**: `skills/qa-task/SKILL.md`

**Testing**: F5 under bash/zsh. Mutation M9 → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 1 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 2 |

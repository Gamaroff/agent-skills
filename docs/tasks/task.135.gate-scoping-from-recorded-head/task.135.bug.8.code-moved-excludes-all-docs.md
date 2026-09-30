# Bug Report: Task 135 - CODE_MOVED excludes all of docs/, hiding documentation deliverables

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR2-4)
**Date Found**: 2026-09-30

## Description
Cycle 1's fix counts every path except `docs/`, so a documentation task whose deliverable is `docs/reference/…` or `docs/architecture/…` skips re-review after the deliverable changed. Only the work item's own directory (gate, QA report, task document, implementation report) is bookkeeping. Untracked files are also invisible (CR2-5).

## Recommendation
Exclude only the task directory (`":(exclude)$TASK_DIR"`), and count untracked files outside it.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Excludes only the task directory (`":(exclude)$TASK_DIR"`); untracked files outside it count (CR2-5). Tests F7, F8; mutations M13, M14 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 2 |

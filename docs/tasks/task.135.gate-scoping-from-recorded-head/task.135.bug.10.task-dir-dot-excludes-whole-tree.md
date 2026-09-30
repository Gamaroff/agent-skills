# Bug Report: Task 135 - A task directory of "." excludes the whole tree from CODE_MOVED

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe, CR3-2)
**Date Found**: 2026-09-30

## Description
When `TASK_DIR` is `.`, `":(exclude)."` excludes everything: `git rev-list --count <head>..HEAD -- . ":(exclude)."` printed 0 against a true 2, so a clean PASS always skips. `DOC_MOVED` also reads 0 for a `TASK_FILE` that does not exist.

## Recommendation
Refuse a task directory that is the repository root; require the task file to exist before measuring.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: The trigger HALTs when the task directory is the repository root (`git -C "$TASK_DIR" rev-parse --show-prefix` empty); the task-file guard (bug 9) covers the missing-file DOC_MOVED case. Test J2; mutation M18 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 3 |

# Bug Report: Task 147 - verify-push-state --scope with a dot segment or double slash passes vacuously

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR-4)
**Date Found**: 2026-09-25

## Description

`.`, `docs/./x` and `docs//x` pass the existence check but match no porcelain path.

**Location**: shared/resources/verify-push-state.sh

## Recommendation

Collapse `//` and `.` segments, and refuse a scope that means the whole repository. Add cases for both.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: verify-push-state collapses `//` and `/./` and a leading `./`, strips a trailing `/.`, and refuses a scope that normalises to the whole repository.

**Testing**: Cases 24–26 (`docs/./tasks/task.1`, `docs//tasks/task.1`, `.`). Mutations of each normalisation turn their case red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 3                          |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

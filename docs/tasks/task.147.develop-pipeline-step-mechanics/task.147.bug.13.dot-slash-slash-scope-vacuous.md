# Bug Report: Task 147 - A relative scope .//docs normalises to /docs and passes vacuously

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 4, CR-1)
**Date Found**: 2026-09-25

## Description

`verify-push-state.sh` strips a leading `./` once, before it collapses repeated slashes, so the scope `.//docs/tasks/task.1` becomes `/docs/tasks/task.1`. That value passes the existence check and then matches no porcelain path.

## Steps to Reproduce

In a pushed branch whose work item file is dirty, run `verify-push-state.sh --base main --scope .//docs/tasks/task.1`.

## Expected Behavior

Exit 1: the work item's own file is dirty.

## Actual Behavior

The script prints `! outside scope (warning): docs/tasks/task.1/r.md` and `clean within scope`, then exits 0.

## Recommendation

After the collapse loops, strip any leading `/` from a relative scope. Add a `.//docs` case.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: After the collapse loops, a relative scope has any leading `/` stripped.

**Testing**: Case `.//docs/tasks/task.1` → exit 1. Mutation: removing the strip turns it red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 4                          |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

## QA Verification

**Date**: 2026-09-25 (QA cycle 5)
**Result**: ✅ Verified fixed (case 27; the mutation goes red). The same review found that the gate behind it admits other vacuous spellings, filed as bug.14.

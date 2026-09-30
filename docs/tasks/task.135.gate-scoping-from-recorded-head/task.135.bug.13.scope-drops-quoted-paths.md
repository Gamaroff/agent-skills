# Bug Report: Task 135 - The scope file list drops paths git C-quotes

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe, CR3-6)
**Date Found**: 2026-09-30

## Description
`git diff --name-only` C-quotes non-ASCII, quote, backslash and control-character paths under the default `core.quotePath`; the quoted name then matches nothing as a pathspec and the file silently leaves the cycle-3+ scope. The non-vacuity HALT cannot see it because bookkeeping files keep the patch non-empty.

## Recommendation
Read the list NUL-delimited (`git -c core.quotePath=false diff --name-only -z`); fixture with a non-ASCII filename.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: The scope list is read NUL-delimited: `git -c core.quotePath=false diff --name-only -z` with `read -r -d ''` (verified under bash and zsh). Test K with `skills/é.sh`; mutation M20 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 3 |

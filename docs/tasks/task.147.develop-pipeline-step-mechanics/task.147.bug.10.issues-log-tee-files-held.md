# Bug Report: Task 147 - `tee -a Issues Log` writes files a guard re-run holds, failing Step 8

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR-1)
**Date Found**: 2026-09-25

## Description

The guard and Restore log through `| tee -a Issues Log`, which creates untracked `Issues` and `Log` files at the repo root. A second guard run holds them, and they are recorded as held paths, so Step 8 check 5 fails on them.

**Location**: shared/resources/develop-pipeline-step-4-create-pr.md

## Recommendation

Replace the `tee` with a plain echo. A guard-twice test asserts that no `Issues` or `Log` file is created or held.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: Replaced the three `| tee -a Issues Log` with plain echo (the orchestrator copies the lines into the report).

**Testing**: step-4-leak-check: guard, guard, restore asserts no `Issues` or `Log` file and a held record of exactly the strays. Mutation: restoring the tee turns it red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 3                          |
| 2026-09-25 | Ready for QA | qa-fix     | Fix implemented and mutation-proved |

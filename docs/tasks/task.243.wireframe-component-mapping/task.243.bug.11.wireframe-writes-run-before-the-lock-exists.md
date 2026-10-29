# Bug Report: Task 243 - The wireframe writes run before the pipeline lock exists

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

Step 1 § Wireframe writes (`develop-pipeline-step-1-create-branch.md:112`) runs before "Write the
Pipeline Lock File" (line 158). Suppose a session is interrupted after the writes have modified the
document, catalogue or map, but before the lock exists. There is then no lock to resume from, so the
next run starts fresh. Its Step 1 calls `/create-branch`, which refuses a tree holding any
uncommitted file other than `*.implementation.*.md`.

## Expected Behavior

An interrupted run resumes and finishes its writes.

## Actual Behavior

The next run halts at Step 1 on its own earlier writes.

## Recommendation

Make the writes after the lock exists and before the review reads the document. That is the start
of Step 2, a step a resume re-enters, and every part of the section is idempotent.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: Step 1 writes the lock last, so any write inside Step 1 has a window with no lock.

**Fix**: the writes moved to the start of the shared Step 2 document, before its gate check. At that
point the branch and the lock both exist. A resume re-enters Step 2, and every part of the section
is idempotent. Step 2's document loads whether the review runs or is skipped. The Step 3 backstop is
gone, which also clears CR4-4. `develop-bug` has its own Step 2 document, so it never reaches the
section.

**Testing**: the ordering test asserts that the section comes before Step 2's Gate Check and is
absent from Step 1. Mutation-proven: putting the section back in Step 1 turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 4 (code review CR-2), confirmed against Step 1's section order |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 4) |

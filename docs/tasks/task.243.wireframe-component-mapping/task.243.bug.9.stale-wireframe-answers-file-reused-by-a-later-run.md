# Bug Report: Task 243 - A stale wireframe answers file is written into a later run's document

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

`.claude/state/wireframe-answers.json` does not say which document it belongs to. 0d writes it only
when it asks a question, and nothing ever deletes it: `advance-pipeline-lock.sh --complete` removes
only its own named records. A later run whose 0c-wire finds no open node therefore reaches Step 3
with the previous run's file. It then writes those answers into this document's table and the map
(`develop-pipeline-step-3-develop-loop.md:25`).

## Steps to Reproduce

1. Run `/develop-task` on task A, which has open wireframe nodes, and answer them.
2. Run `/develop-task` on task B, whose nodes the map already settles.
3. Task B's Step 3 writes task A's answers.

## Expected Behavior

Each run writes only its own answers, once.

## Actual Behavior

The previous run's answers are written into another document and recorded in the map again.

## Recommendation

Put the document path in the file and check it before writing. Delete the file when 0c-wire starts
a fresh run, and once its answers are written.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: the held file named no document and had no owner to delete it.

**Fix**:
- 0d writes `{"document": …, "answers": [...]}`.
- A fresh 0c-wire deletes any held file. A resume skips 0c-wire, so it keeps its own.
- Step 1 discards a held file that names another document.
- Step 1 deletes the file once its answers are written.

**Testing**: two new tests, "a fresh 0c-wire discards a held answers file left by an earlier run"
and "Step 1's wireframe writes discard another document's held answers". Each is mutation-proven:
removing the `rm -f`, or the document check, turns its test red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 3 (code review CR-3), confirmed against `advance-pipeline-lock.sh` |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 3) |

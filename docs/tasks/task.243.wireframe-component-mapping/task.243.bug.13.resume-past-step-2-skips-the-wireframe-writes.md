# Bug Report: Task 243 - A resume can land past Step 2 and skip the wireframe writes

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

The wireframe writes now live only at the start of Step 2
(`develop-pipeline-step-2-review.md`, "Wireframe writes (before the gate check)"), and cycle 4
removed the Step 3 backstop. Step 1 creates the lock at `current_step: 2`, the step that is next
(`develop-pipeline-step-1-create-branch.md:140`, with the note at line 148). The resume detector
reads the lock's step as finished: when every summary it expects is present, it recommends
`min(LOCK_STEP + 1, 8)` (`pipeline-resume-detector-prompt.md:166`). Step 2 writes no summary, so a
run that stopped inside Step 2 can be recommended Step 3. That includes a stop at this section's own
HALT. Step 3 then builds from a component table the held answers never reached.

## Steps to Reproduce

1. Run `/develop-task` on a task with a wireloom block and `ui.wireframeMap` set, and answer the 0d
   questions.
2. Stop the session inside Step 2, before the writes.
3. Resume. The detector recommends Step 3.

## Expected Behavior

The held answers are written before any step that reads the document.

## Actual Behavior

They stay in `.claude/state/wireframe-answers.json`, and Step 3 builds without them.

## Recommendation

Put back a one-line guard at the start of Step 3: if the held file still exists, run Step 2 §
Wireframe writes first. The detector's reading of `current_step` is a separate, older question about
the lock's meaning, and the guard does not depend on it.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 5 (code review CR-1), confirmed against the lock contract and the resume detector |

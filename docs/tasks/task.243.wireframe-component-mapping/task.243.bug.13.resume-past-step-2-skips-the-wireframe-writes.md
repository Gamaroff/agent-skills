# Bug Report: Task 243 - A resume can land past Step 2 and skip the wireframe writes

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
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

## Developer Fix Cycle

### Iteration 1

**Root Cause**: cycle 4 removed the Step 3 backstop on the assumption that every resume re-enters
Step 2. The detector can recommend Step 3 for a run that stopped inside Step 2.

**Fix**: a new first section of `develop-pipeline-step-3-develop-loop.md`, "Held wireframe answers".
If `.claude/state/wireframe-answers.json` holds **this document's** answers (the same `./`-normalised
`jq` comparison as Step 2), it prints `HALT` and exits 1, and the orchestrator runs Step 2 § Wireframe
writes before starting Step 3 again. Another run's file, an unreadable file, or no file passes, so
`develop-bug` is never stopped by it. The check never deletes the file.

Also fixed in this cycle (CR5-2, low): Step 2's key check treats a missing or non-string `document`
key as an error (exit 5 → `HALT`, file kept) instead of as another document.

**Testing**: "Step 3 stops on this document's held answers and passes otherwise" covers no file,
this document's file (held as `docs/story.md`, checked as `./docs/story.md`), another document's file
and an unreadable file, plus the section's position before the codebase mapping. The unreadable-file
test for Step 2 gains `{"answers":[]}` and `{"document":null}`. Mutation-proven: 5 of 5 `covered`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 5 (code review CR-1), confirmed against the lock contract and the resume detector |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 5) |

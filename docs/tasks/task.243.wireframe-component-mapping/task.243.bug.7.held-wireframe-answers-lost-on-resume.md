# Bug Report: Task 243 - Held wireframe answers are never written on a resumed run

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

`develop-pipeline-step-3-develop-loop.md:14` gates the wireframe writes on "only when Phase 0c-wire
ran". A resumed run skips 0c: step-0 0b reads "If starting fresh: continue to 0c"
(`develop-pipeline-step-0-resolve-and-prepare.md:343`). So a run that asked the wireframe questions
and was then resumed in a new session reaches Step 3 believing 0c-wire did not run. It never writes
the answers held in `.claude/state/wireframe-answers.json`, and it has no `WIREFRAME_TABLE` to pass
to `/develop`.

## Steps to Reproduce

1. Run `/develop-task` on a task with a wireloom block and `ui.wireframeMap` set. Answer the 0d
   wireframe questions.
2. End the session before Step 3 (a PreCompact pause, or a HALT), then resume.
3. Step 3's "Wireframe writes" section is skipped.

## Expected Behavior

The held answers are written on any path that reaches the branch, resumed or not.

## Actual Behavior

They stay in `.claude/state` and are never written. Step 3 also builds without the table.

## Recommendation

Gate the writes on the held answers file, not on 0c-wire having run in this session. Have Step 3
read the component table from the document, not from an in-session variable.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: the writes were gated on an in-session fact ("0c-wire ran"), and the table reached
Step 3 as an in-session variable. A resume from a new session has neither.

**Fix**: the writes moved to Step 1 § Wireframe writes
(`develop-pipeline-step-1-create-branch.md`), gated on `.claude/state/wireframe-answers.json`
existing. Step 3 builds from the document's component table. `WIREFRAME_TABLE` is gone, and Step 3
runs the Step 1 section itself if the file is still there.

**Testing**: "Step 1's wireframe writes create the catalogue and map, and keep this document's
answers" runs the Step 1 block with no Phase 0 at all, which is the resume case. Mutation-proven:
making the key check reject the document's own answers turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 3 (code review CR-1), confirmed against step-0 0b |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 3) |

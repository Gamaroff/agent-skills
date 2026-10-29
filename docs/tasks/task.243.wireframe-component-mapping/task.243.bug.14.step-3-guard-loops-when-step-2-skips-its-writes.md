# Bug Report: Task 243 - The Step 3 guard loops when Step 2 skips its wireframe writes

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-14
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

The Step 3 guard (`develop-pipeline-step-3-develop-loop.md`, "Held wireframe answers") has no gate.
It HALTs whenever the held file holds this document's answers, and it sends the run to Step 2 §
Wireframe writes. That section runs only when `ui.wireframeMap` is set and the document holds a
wireloom block (`develop-pipeline-step-2-review.md:17`), and otherwise skips silently without
touching the file. The guard's own prose forbids deleting the file (line 32).

A held file for this document can therefore outlive the gate. That happens when the setting is
turned off, or the wireloom block removed, while a run is paused. A resume skips Phase 0's
fresh-run delete, so the run cycles Step 3 HALT → Step 2 skip → Step 3 HALT with no way forward.

## Steps to Reproduce

1. Start `/develop-task` on a task with a wireloom block and `ui.wireframeMap` set, and answer 0d.
2. Pause before Step 2's writes. Remove `ui.wireframeMap` from `skills-config.yaml`.
3. Resume at Step 3.

## Expected Behavior

The guard and the writes share one gate, so the guard never sends the run to a section that will
skip.

## Actual Behavior

Step 3 HALTs, Step 2 skips, and Step 3 HALTs again.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: cycle 5 added the guard without the gate of the section it hands the run to.

**Fix**: the guard now opens with Step 2's gate sentence word for word. With the gate false, held
answers are not written, because the feature is off for this document, and the next fresh run's
0c-wire deletes the file. The guard also uses Step 2's filter and three-way `case`:
- 0 HALTs, so the run writes first;
- 1 passes, because the file is another document's;
- anything else HALTs as unreadable, which also covers jq missing.

This clears CR6-2 too.

**Testing**:
- "Step 3's guard and Step 2's writes share one gate and one key check" asserts both sections state the gate and that the two jq filters are identical.
- The Step 3 test now expects a HALT on an unparseable file and on a missing key.
- A new test runs the guard with no jq on `PATH` (CR6-3).

Mutation-proven: 6 of 6 `covered`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 6 (code review CR-1), confirmed against both documents' gates |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 6) |

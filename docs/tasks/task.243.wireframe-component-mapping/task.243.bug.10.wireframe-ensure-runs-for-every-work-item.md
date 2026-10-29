# Bug Report: Task 243 - Step 1 runs `ensure` for every work item, wireframe or not

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

Step 1 § Wireframe writes (`develop-pipeline-step-1-create-branch.md:117`) runs `ensure` "on every
path through Step 1" and says it "answers `unset` and writes nothing when the feature is off".
`ensure` answers `unset` only when **both** `ui.componentCatalogue` and `ui.wireframeMap` are absent
(`wireframe-map.js:544`). So a consumer that has the feature on gets its catalogue created or
updated on the branch of every story and task, including ones with no wireframe, and that change is
committed with unrelated work. Before cycle 3, the call sat inside the 0c-wire gate: `ui.wireframeMap`
set **and** a wireloom block in the document.

## Expected Behavior

`ensure` runs only for a work item that 0c-wire would resolve.

## Actual Behavior

It runs for every work item in an opted-in consumer.

## Recommendation

Put the 0c-wire gate back on the writes section, and correct the sentence.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: when cycle 3 moved the writes, it took `ensure` out of the 0c-wire gate and assumed
`ensure`'s own `unset` was that gate.

**Fix**: the writes section, now at the start of Step 2 (`develop-pipeline-step-2-review.md`),
opens with the 0c-wire gate: `ui.wireframeMap` set **and** a wireloom block in the document. The
false sentence is gone.

**Testing**: "develop Phase 0 resolves in 0c-wire and asks in 0d" asserts the section states the
gate. Mutation-proven: replacing the gate sentence turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 4 (code review CR-1), confirmed against `ensure()` |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 4) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 5: mutation-proven tests hold at 95e5168d |

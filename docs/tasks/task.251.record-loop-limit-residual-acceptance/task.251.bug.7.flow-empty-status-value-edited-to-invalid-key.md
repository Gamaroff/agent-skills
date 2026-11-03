# Bug Report: Task 251 - An empty status value in a flow entry is edited to `status:waived`

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-7
**Severity**: LOW
**Priority**: P3
**Status**: New
**Found By**: QA Engineer (cycle 5 code review CR-1, reproduced)
**Date Found**: 2026-11-03

## Description

`waiveEntry` rewrites a matched flow `status` segment as `$1waived$2`, where `$1` is the key and its colon. When the original value was empty (`status:`) there is no space after the colon, so the result is `status:waived`.

## Steps to Reproduce

Call `planGateEdit` on a gate whose open entry is `  - {id: X, status:}`.

## Expected Behavior

`  - {id: X, status: waived}`, or a refusal (`unreadable-gate`) with nothing written.

## Actual Behavior

`edit` with `ok: true` and `  - {id: X, status:waived}`. PyYAML reads that as one key, `status:waived`, with a null value, so a strict consumer sees no status. The shared reader (`readKeysInto`) tolerates it, which is why the writer's read-back accepts the edit.

## Impact

Low. The shape is not one this pipeline writes (gates are block style), and the pipeline's own reader reads the entry as waived.

## Recommendation

Emit `: waived` when the matched key text ends in a colon with no whitespace after it, or refuse an empty-value status. Add the shape to the flow-entry tests.

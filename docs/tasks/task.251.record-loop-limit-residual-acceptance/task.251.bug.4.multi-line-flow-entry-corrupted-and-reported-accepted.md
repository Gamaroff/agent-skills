# Bug Report: Task 251 - A multi-line flow-style gate entry is edited into invalid YAML and reported accepted

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute review, reproduced)
**Date Found**: 2026-11-03

## Description

Cycle 1's fix made `waiveEntry` take the flow branch only when the dash line starts a mapping with `{`
and also holds the closing `}`. An entry whose mapping closes on a later line (`- {id: X,` then
`status: open}`) fails the second test and falls into the block branch.

## Steps to Reproduce

Call `planGateEdit` on a gate whose only entry is `  - {id: X,\n     status: open}`.

## Expected Behavior

The entry reads `status: waived`, or the writer refuses and writes nothing.

## Actual Behavior

`status: open` is left as-is, a stray `    status: waived` line is inserted after the entry (invalid YAML),
and the result is `edit` with `ok: true`, because the loose reader reads the stray line as the status.
The single-line flow entry is edited correctly.

## Impact

The accepted gate is not valid YAML and still holds the open status. The input is not one this
pipeline writes (gates are block style), so exposure is narrow, but the writer reports success.

## Recommendation

Refuse (`unreadable-gate`, nothing written) any entry whose dash line opens `{` without closing it on
that line. Add a refusal test, and keep the single-line flow control.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-03 (QA cycle 2 fix)

**Root cause**: cycle 1's flow-style test required the closing `}` on the dash line; an entry that opens
`{` there and closes later fell into the block branch, which cannot edit a flow mapping.

**Fix**: `planGateEditRaw` refuses (`unreadable-gate`, nothing written) any open entry whose dash line
opens a flow mapping that does not close on that line.

**Files**: `shared/resources/accept-qa-residual.js` (+ bundled copies), `shared/resources/tests/accept-qa-residual.test.mjs`.

**Test**: "a flow entry that closes on a later line is refused with nothing written; the single-line
flow control is edited" (red when the refusal is disabled: proven).

## Status History

| Date       | Status       | Changed By | Notes                         |
| ---------- | ------------ | ---------- | ----------------------------- |
| 2026-11-03 | New          | QA         | Found in QA cycle 2           |
| 2026-11-03 | Ready for QA | qa-fix     | Fixed with a mutation-proven test |

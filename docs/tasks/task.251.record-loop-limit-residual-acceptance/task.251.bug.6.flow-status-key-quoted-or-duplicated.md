# Bug Report: Task 251 - A quoted or duplicated status key in a flow entry is edited and reported accepted

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 4 code review CR-1 and CR-2, reproduced)
**Date Found**: 2026-11-03

## Description

`waiveEntry` waives a flow entry by finding the top-level segment that starts with a plain `status:` key.
Two shapes defeat that test: a quoted key, and a key that appears twice.

## Steps to Reproduce

Call `planGateEdit` on a gate whose open entry is `  - {id: X, "status": open}` (or `'status'`), or
`  - {id: X, status: open, status: open}`.

## Expected Behavior

The entry reads waived, or the writer refuses (`unreadable-gate`) and writes nothing.

## Actual Behavior

`edit` with `ok: true`. The quoted key gets a second, plain key appended (`{id: X, "status": open, status: waived }`), so the mapping holds two `status` keys and a parser that reads the quoted one sees `open`. For the duplicate, only the first copy is waived (`{id: X, status: waived, status: open}`).

## Impact

The accepted gate can still hold an open status. Neither shape is one this pipeline writes (gates are block style), so exposure is narrow, but the writer reports success.

## Recommendation

Match the key with optional quotes around it in the one segment test, and waive every top-level segment that matches instead of the first only. Add both shapes as tests beside the existing flow-entry ones, and keep the plain single-status control.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-03 (QA cycle 4 fix)

**Fix**: the top-level segment test in `waiveEntry` now accepts a quoted key (`status`, `"status"`, `'status'`) and waives **every** matching segment instead of the first only. A repeated `status` is therefore fully waived (`{id: X, status: waived, status: waived}`).

A quoted key is recognised by the segment test, but the shared reader (`readKeysInto`) does not read a quoted key as a status, so the writer's own read-back cannot confirm the edit and the plan is refused (`unreadable-gate`) with nothing written. That is the safe outcome: what the finding named was `accepted` over an entry that still reads open, or a second `status` appended beside the quoted one. Neither can happen now.

**Files**: `shared/resources/accept-qa-residual.js` (+ bundled copies), `shared/resources/tests/accept-qa-residual.test.mjs`.

**Tests**: repeated key waives every copy; double- and single-quoted keys are refused with nothing written. Mutation-proven: waiving the first copy only turns the repeated-key test red; dropping the quoted-key match turns both quoted-key tests red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-11-03 | New          | QA         | Found in QA cycle 4                 |
| 2026-11-03 | Ready for QA | qa-fix     | Fixed with mutation-proven tests    |
| 2026-11-03 | Closed | qa-task | Verified by task.251.qa.5.record-loop-limit-residual-acceptance.md |

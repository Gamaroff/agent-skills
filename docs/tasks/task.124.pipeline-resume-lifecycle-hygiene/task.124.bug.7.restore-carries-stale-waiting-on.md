# Bug Report: Task 124 - `--restore` carries a stale `waiting_on` into the rebuilt lock, and `--clear` in the no-lock window is a silent no-op

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 2 (refute pass), code review finding CR-

## Description
`--restore` strips only the five halt/pause fields. A PreCompact snapshot is the lock plus those fields, so a `waiting_on` set at the moment of the pause survives into the rebuilt lock. Meanwhile any `set-waiting-on.sh --clear` issued between the pause and the restore (no lock present) exits 0 doing nothing. The two fixes combine: the restored lock carries a wait for a dispatch this session never made, and the Stop hook allows every stop — a real stall included — until the recorded budget elapses.

## Steps to Reproduce
Set `waiting_on` on a lock; snapshot it (PreCompact); `--restore`; `jq .waiting_on` on the new lock → present.

## Expected Behavior
A rebuilt lock is not waiting on anything this session dispatched: `--restore` drops `waiting_on`.

## Actual Behavior
The field survives the restore.

## Impact
The Stop hook's new escape valve is open for a stall it should catch.

## Recommendation
`del(.waiting_on)` in the restore jq; header and pause doc say so; a test asserts the drop.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The restore stripped the five halt/pause fields the snapshot adds and nothing else; `waiting_on` is a lock field the snapshot inherits, and a `--clear` in the no-lock window is by design a no-op.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
`--restore`'s jq also deletes `.waiting_on`; the header, the pause doc and the resume contract state the drop.

**Files Modified**:
- `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh` (+1 assertion per shell)
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (the del() assertion names waiting_on)

**Testing**:
- lock helper 67/67 (bash + zsh); parity 6/6

**Verification Steps for QA**:
1. Snapshot with `waiting_on` → `--restore` → `jq has("waiting_on")` on the lock → false

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |

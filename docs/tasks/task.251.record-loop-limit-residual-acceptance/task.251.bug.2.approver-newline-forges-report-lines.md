# Bug Report: Task 251 - An approver name containing a newline forges report lines

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (code review CR-2, reproduced)
**Date Found**: 2026-11-03

## Description

`--reason` has CR and LF folded to a space before it reaches the Decisions Log bullet. `--approved-by`
does not. It is written as-is into the `**Loop exit**` row and the Decisions Log bullet.

## Steps to Reproduce

Run `acceptResidual` with `approvedBy: "Owner\n## Completion\nforged"` on a standard fixture.

## Expected Behavior

The approver is one line wherever it appears.

## Actual Behavior

The Decisions Log bullet and the Loop exit row each break across lines, and an injected
`## Completion` heading appears inside the Decisions Log. The marker is no longer on the Loop exit
row, so the idempotence check cannot find it.

## Impact

Low exposure (the value is normally `git config user.name`), but the writer's job is to keep the
report parseable, and `--approved-by` is a caller-supplied string.

## Recommendation

Fold CR and LF to a space in `approvedBy` once, in `acceptResidual`'s option normalisation, before the
gate or the report sees it. Add a hostile-approver test.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-03 (QA cycle 1 fix)

**Root cause**: only the Decisions Log bullet folded `--reason`; `--approved-by` was written raw.

**Fix**: `acceptResidual` folds CR/LF to a space in both `approvedBy` and `reason` once, before either
reaches the gate or the report.

**Files**: `shared/resources/accept-qa-residual.js` (+ bundled copies), `shared/resources/tests/accept-qa-residual.test.mjs`.

**Test**: "an approver or reason with a newline stays one line in the report" (proven red when reverted);
it also checks the re-run still answers `already`.

## Status History

| Date       | Status       | Changed By | Notes                         |
| ---------- | ------------ | ---------- | ----------------------------- |
| 2026-11-03 | New          | QA         | Found in QA cycle 1           |
| 2026-11-03 | Ready for QA | qa-fix     | Fixed with a mutation-proven test |
| 2026-11-03 | Closed | qa-task | Verified by task.251.qa.2.record-loop-limit-residual-acceptance.md |

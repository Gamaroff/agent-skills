# Bug Report: Task 180 - a side effect followed by a kill or timeout scores errored, not reproduced

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 6 safety re-probe, code review CR-2 / TASK-180-018)
**Date Found**: 2026-10-12

## Description

`scoreFenceRun` returns `errored` for a killed or timed-out child (step 1) before it checks `expected.absent` (step 2). An input whose side effect happened and then killed or hung the shell is dropped by `computeVerdict`. When another hostile case is rejected, the run reads `engages` over a reproduced injection. TASK-180-006 already put the absent check ahead of the parse-error branch, but not ahead of step 1.

## Steps to Reproduce

Block `X='<slot>'` + a `case` guard that prints REFUSED. Hostile case `'$(touch pwned; kill -9 $$)'` with `expected: {exit: 1, stdout: "REFUSED\n", absent: ["pwned"]}`, plus a rejected hostile and a legitimate case.

## Expected Behavior

The case is reproduced: `pwned` exists.

## Actual Behavior

`kill: errored`; verdict `engages`. Reproduced on 243bc237.

## Recommendation

Check `expected.absent` before the never-ran and launch-failure branches, so a side effect that happened is scored whatever the shell's exit.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 6

**Fix**: `scoreFenceRun` checks `expected.absent` first, before the never-ran and launch-failure branches; the stated order is updated.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`.

**Testing**: New test: `'$(touch pwned; kill -9 $$)'` is reproduced and the verdict is not `engages`. Mutation (absent check moved back after never-ran) red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 6 — reproduced on 243bc237 |
| 2026-10-12 | Ready for QA | qa-fix      | absent checked first; mutation-proven |

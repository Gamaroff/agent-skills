# Bug Report: Task 232 - The fence scorer's "unreadable is a side effect" rule has no test

**Task**: [Link](./task.232.probe-expected-path-assertions.md)
**Bug ID**: TASK-232-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2; mutation spot check Q5)
**Date Found**: 2026-10-25

## Description

The fence scorer checks `expected.absent` before it checks whether the shell stopped. A side effect that happened is a reproduction whatever the shell then did. Cycle 1 changed that check to `casePathState(caseDir, p).state !== "missing"` (`shared/resources/security-probe.mjs:3364`), so a path the run left unreadable also counts as a side effect.

No test holds this. Under mutation Q5 (`!== "missing"` changed to `=== "present"`), the suite stays green.

## Steps to Reproduce

Apply Q5 in a scratch worktree and run `shared/resources/tests/security-probe.test.mjs`. Zero tests fail. The script was `t232-qa2-mutate.mjs`.

## Expected Behavior

At least one test fails when an unreadable `absent` path stops counting as a side effect.

## Actual Behavior

The suite passes. A hostile fence case that plants a loop and then stops would score as errored instead of reproduced, and nothing would show it.

## Impact

A regression here silently turns a reproduced escape into an errored row on the fence form.

## Recommendation

Add a fence test where a hostile case plants `ln -s loop loop` and then stops, with `absent: ["loop/x"]`. It must score as reproduced on every probe shell. Confirm the test is red under Q5.

## Developer Fix Cycle

### Iteration 1 — 2026-10-25

#### Investigation

Cycle 1 changed the fence scorer early check to `state !== "missing"`, but no test reached the unreadable branch.

#### Fix Implementation

Test only — the behaviour is unchanged.

**Files modified**: `shared/resources/tests/security-probe.test.mjs`

**Testing**: New fence test: a hostile case plants `loop -> loop` and then stops, with `absent: ["loop/x"]`; reproduced on every probe shell. Red under Q5 (F2).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-25 | New | qa-task | Found in QA cycle 2 |
| 2026-10-25 | Ready for QA | qa-fix | qa-fix cycle 2 |

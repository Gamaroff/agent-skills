# Bug Report: Task 180 - the parse-failure branch masks a reproduced side effect

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, code review CR-3 / TASK-180-006)
**Date Found**: 2026-10-12

## Description

The diagnostic branch runs before `expected` is compared. With the slot used in two quoting contexts, line 1 runs an injected `$(touch pwned)` and line 2 fails to parse; `pwned` is created in the case directory, yet the case is recorded `errored`, and the sentinel does not watch the work dir.

## Expected Behavior

A side effect `expected.absent` names is a reproduction whatever the shell did afterwards.

## Recommendation

Compare `expected.absent` before scoring a diagnostic run `errored`; regression test.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 2

**Root cause**: The diagnostic branch was checked before `expected.absent`.

**Fix**: The cycle-2 structural move: one ordered scorer, `scoreFenceRun` — never-ran/launch → absent-hit (compared, reproduction) → shell diagnostic (errored) → expected → exit status. Two cycles of HIGHs were each a branch in the wrong order, so the order is now stated once.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`; the rule restated in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, qa-task / qa-story `SKILL.md`, `CHANGELOG.md`.

**Testing**: Regression test (slot in two quoting contexts, `$(touch pwned)'`) → reproduced. Mutation G3 (absent check removed) → red, scored errored.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-12 | New          | qa-task    | QA cycle 2 |
| 2026-10-12 | Ready for QA | qa-fix     | Fixed in the scoreFenceRun rewrite, mutation-proven |

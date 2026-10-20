# Bug Report: Task 180 - expected.absent can name a file the case's own fixture writes

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (QA cycle 2 refute pass, code review CR-1 / TASK-180-004)
**Date Found**: 2026-10-12

## Description

A fence: case whose `expected.absent` names a file that its own `fixture.files` writes (files `{"pwned": ""}`, absent `["pwned"]`) mismatches on every run: every hostile case scores `accepted` and the verdict reads `absent` with a full count. `runShellCase` and `runCliCase` decline the same shape (task.128 BUG-13); `runFenceCase` has no such guard.

## Expected Behavior

The case is declined with a named reason, never scored.

## Recommendation

Decline when an `expected.absent` name equals a `fixture.files` key or that key's first path segment; regression test.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 2

**Root cause**: runFenceCase had no equivalent of the shell and cli: arms' BUG-13 guard.

**Fix**: Decline a case whose `expected.absent` names a `fixture.files` key or its first path segment ("which the case's own fixture writes").

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`; the rule restated in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, qa-task / qa-story `SKILL.md`, `CHANGELOG.md`.

**Testing**: Regression test for a file and a nested directory; mutation G1 (guard removed) → red, hostile scored accepted.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-12 | New          | qa-task    | QA cycle 2 |
| 2026-10-12 | Ready for QA | qa-fix     | Fixed in the scoreFenceRun rewrite, mutation-proven |
| 2026-10-12 | Closed       | QA Engineer | Verified by qa.3 (TASK-180-004 FIXED for exact names) and qa.4 (TASK-180-010 normalised collision FIXED) (closed at the PR review, PC trail finding) |

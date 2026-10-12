# Bug Report: Task 180 - the TASK-180-017 integration test no longer reaches ghFreePath

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 8, code review CR-1 / TASK-180-020)
**Date Found**: 2026-10-12

## Description

Cycle 7 made the `gh` text check read fixture `files`. The TASK-180-017 integration test's fixture spells out `type -ap gh`, so the run is now declined `needs-fake-gh` before anything spawns. The test passes without reaching `ghFreePath` or the trip-wire. Confirmed: with the `env.PATH = ghFreePath(...)` line removed, the test stays green (only the unit test goes red). The structural guard has no integration coverage.

## Recommendation

Make the fixture reach `gh` without spelling it out (for example a name assembled at run time), assert `r.cases` is non-empty so a pre-spawn decline cannot satisfy the test, and correct the comment that says the trip-wire answered.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 8

**Fix**: the fixture assembles the name at run time (`n=g; type -ap "${n}h"`), so the pre-spawn text check cannot see it and the run reaches `ghFreePath`. The test now asserts that cases ran, and the comment says the trip-wire answered at run time.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`.

**Testing**: Mutation: `ghFreePath` call removed → the integration test red (after the per-case timeout on this host, whose `gh` is a bash wrapper the `BASH_ENV` fixture recurses through).

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 8 — confirmed on ffaa7c23 |
| 2026-10-12 | Ready for QA | qa-fix      | Test reaches the guard; mutation-proven |

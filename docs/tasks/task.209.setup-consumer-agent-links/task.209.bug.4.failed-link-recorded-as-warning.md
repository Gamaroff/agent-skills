# Bug Report: Task 209 - A link that could not be made is recorded as a warning, and the run exits 0

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3)
**Date Found**: 2026-10-14

## Description

The cycle-2 fix reports a failed `mkdir`/`ln` as `failed`, but `link_agents` counts it with the deliberate non-actions (kept, missing) and records a `warn` step "left alone" (`scripts/setup-consumer.sh:2113`). `WIZARD_HAS_FAIL` stays false: the run exits 0 and the links-only summary says "Restart your agents".

## Expected Behavior

A link that could not be made fails the step: non-zero exit, and the "fix the error and re-run" next step.

## Recommendation

Count `failed` separately and record the step as `fail` when any link failed.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-14

**Root Cause**: the cycle-2 fix added a `failed` status but `link_agents` still had two buckets,
ok and "left alone", and the run's exit code ignored recorded failures.

**Fix**: `failed` is counted separately and records the step as `fail`; the wizard carries on so the
hooks still install, and `_exit_on_fail` makes every `main()` path exit 1 when any step failed. One
`_agent_index` lookup now serves `_check_link_agents` and `link_agents` (cycle-3 CR-3), and the
status-word comment lists `failed` (CR-4).

**Testing**: the failed-link test asserts `fail`, a non-zero exit and the "Fix the error" next step;
`a run whose summary says Setup failed exits 1; one that warns exits 0` tests `_exit_on_fail`.
Mutation-proved: failed back to warn, no exit check, links-only path without the call. The call at
the end of the full wizard is not exercised by a test (the full wizard is interactive).

**Files Modified**: `scripts/setup-consumer.sh`, its agent-links test, `CHANGELOG.md`,
`docs/concepts/getting-started.md`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 3 scoped review — introduced by the cycle-2 fix |
| 2026-10-14 | In Progress | qa-fix | Root cause found |
| 2026-10-14 | Ready for QA | qa-fix | Failed link fails the step; any recorded fail exits 1 |

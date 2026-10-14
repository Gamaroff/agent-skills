# Bug Report: Task 209 - A link that could not be made is recorded as a warning, and the run exits 0

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (cycle 3)
**Date Found**: 2026-10-14

## Description

The cycle-2 fix reports a failed `mkdir`/`ln` as `failed`, but `link_agents` counts it with the deliberate non-actions (kept, missing) and records a `warn` step "left alone" (`scripts/setup-consumer.sh:2113`). `WIZARD_HAS_FAIL` stays false: the run exits 0 and the links-only summary says "Restart your agents".

## Expected Behavior

A link that could not be made fails the step: non-zero exit, and the "fix the error and re-run" next step.

## Recommendation

Count `failed` separately and record the step as `fail` when any link failed.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 3 scoped review — introduced by the cycle-2 fix |

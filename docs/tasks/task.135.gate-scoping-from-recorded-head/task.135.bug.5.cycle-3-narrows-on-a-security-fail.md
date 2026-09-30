# Bug Report: Task 135 - Cycle 3+ narrows even when the prior gate failed on security

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR2-1)
**Date Found**: 2026-09-30

## Description
The Step 3b scope block reads `$SAFETY_REPROBE`, which only the Phase 0 step 5 block assigns — another shell. Before cycle 1's fix the block also read an unbound `$LAST_GATE_DATE`, so every cycle 3+ ran unscoped by accident and the carve-out's absence was hidden. Cycle 1's CR-2 fix binds `$LATEST_GATE` in Step 3b, so cycle 3+ now narrows — including after a security FAIL, where the shared rule requires an unscoped re-probe. Two fixes, each correct alone, combine into a safety regression.

## Expected Behavior
The narrowing branch never runs without a known `SAFETY_REPROBE`; an unset value is a HALT naming what to bind.

## Recommendation
`SAFETY_REPROBE` is an input (clauses 2–3 are judgement): refuse to run cycle 3+ with it unset or not `true|false`. Executed test with it absent from the environment.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: The scope block refuses cycle 3+ unless `SAFETY_REPROBE` is `true` or `false` in its shell (an input: clauses 2–3 are judgement). Phase 0 step 5's probe now binds `$LATEST_GATE` itself, so it can return `true` at all. Tests H1/H2 and I (bash + zsh); mutations M11, M16 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 2 |

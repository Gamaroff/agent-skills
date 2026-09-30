# Bug Report: Task 135 - Step 3b reads `$LATEST_GATE` that only Phase 0's block sets, and reports a false cause

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 1, code review CR-2)
**Date Found**: 2026-09-30

## Description
The Step 3b scope block (qa-task, qa-story, and the shared rule) reads `head:` from `$LATEST_GATE`, which only the Phase 0 block binds. Every fenced block runs in its own shell, so in Step 3b `$LATEST_GATE` is empty, `LAST_GATE_HEAD` is empty, and the block prints "prior gate carries no head: (schema 1)" and runs unscoped. An unreadable gate file gives the same message.

## Steps to Reproduce
Execute the shared block with `PRIOR_GATES=2 SAFETY_REPROBE=false` and no `LATEST_GATE` (bash and zsh) → `Re-review scope: unscoped — prior gate carries no head: (schema 1)`, exit 0. Reproduced in QA cycle 1.

## Expected Behavior
The block binds the latest gate itself, and a missing or unreadable gate on cycle 3+ is a HALT naming that, not a schema-1 claim.

## Impact
The cycle-3+ narrowing never runs in practice, and the report records a false reason.

## Recommendation
Bind `LATEST_GATE` in each skill's Step 3b preamble with `qa-cycle.sh --path gate` when empty; in the shared block, HALT when `$LATEST_GATE` is not a readable file on cycle 3+. Add an executed test for the unbound case.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Each skill's Step 3b preamble binds `LATEST_GATE` via `qa-cycle.sh --path gate` in its own shell when unset. The shared block HALTs on cycle 3+ when `$LATEST_GATE` is not a readable file, instead of claiming "schema 1". The empty-scoped-patch HALT message now names both causes (CR-6).

**Files Modified**: `shared/resources/qa-re-review-scope.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

**Testing**: G [bash/zsh] executes the unbound case; G structural checks both preambles. Mutations M6/M7 → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 1 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 2 |

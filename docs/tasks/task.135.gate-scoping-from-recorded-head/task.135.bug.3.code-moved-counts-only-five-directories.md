# Bug Report: Task 135 - The Phase 0 trigger counts source commits in five named directories only

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1, code review CR-3)
**Date Found**: 2026-09-30

## Description
`CODE_MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- apps packages shared skills evals …)` misses commits to this repo's `scripts/`, `tests/`, `package.json`, and to a consumer's `src/`, `lib/` or `app/`. A clean PASS gate then skips re-review although code moved.

## Expected Behavior
Every path except the documentation the QA cycle itself writes counts as movement.

## Recommendation
`-- . ':(exclude)docs'`, and treat uncommitted tracked changes outside `docs/` as movement too. Extend test F with a commit outside the old list.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: `CODE_MOVED` counts commits on every path except `docs/` (`-- . ':(exclude)docs'`), and an uncommitted change outside `docs/` counts as movement.

**Files Modified**: `skills/qa-task/SKILL.md`

**Testing**: F4 (commit in scripts/), F6 (uncommitted source edit) under bash/zsh. Mutations M8/M10 → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 1 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 1 |

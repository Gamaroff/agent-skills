# Bug Report: Task 125 - 6a's cycle-count lookup runs the full-stem pattern in task/story mode too, so a parent task picks up its co-located bug's report and publishes the bug's Verify Cycles as its own

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-19
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-7 review CR-1 (reviewer confidence high; reproduced by QA: STEM=task.67 beside `task.67.bug.3.implementation.2.*` → CYCLES=3 from the bug's report, under bash + zsh)
**File**: `skills/finalise/SKILL.md:1512`

## Description
The cycle-6 fix (CR-2) made the 6a cycle-count block locate the report itself with the two-shape `find` from 6b. 6b runs that `find` only in its bug branch; 6a runs it for every kind, and the second pattern `${STEM}.*.implementation.*.md` with STEM=`task.67` matches `task.67.bug.3.implementation.2.fix.md`, which `sort -n` on N ranks above the parent's `task.67.implementation.1.*`. This is TASK-125-BUG-8's parent/child leak in the other direction, one block over.

## Steps to Reproduce
`STEM=task.67` in a directory holding `task.67.implementation.1.run.md` (1 QA Cycle) and `task.67.bug.3.implementation.2.fix.md` (3 Verify Cycles) → `CYCLES=3` from the bug's file.

## Expected Behavior
The full-stem pattern applies only in bug mode — the block binds `DOC_KIND` like 6a/7.6b/6b and uses the short pattern alone for a story/task; an executed case with STEM=task.67 beside a higher-numbered bug report expects the parent's count.

## Actual Behavior
The parent's canonical comment reports its bug's cycle count.

## Impact
A wrong QA Cycles figure on every task/story that has a co-located bug with a higher-numbered report.

## Recommendation
Bind `DOC_KIND` in the cycle-count block; second `-name` only when bug; fixture case with the parent beside its bug.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 7)

**Root Cause**: the cycle-6 fix copied 6b's two-shape `find` into the cycle-count block without 6b's kind branch around it; the full-stem pattern is a bug-only shape and in story/task mode it reaches a co-located bug's report.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: the block binds `DOC_KIND` (placeholder + the same verbatim-refusing guard as the other blocks) and selects the `find` patterns by kind — both shapes for a bug, the short shape alone for a story/task, the latter annotated `# short-shape-only: …(TASK-125-BUG-19)` so the enumeration test's reasoned exemption reads it. Executed: `task.67` beside `task.67.bug.3.implementation.2.*` → the parent's count (1); `task.67.bug.3` → its own (3).

**Files Modified**:
- `skills/finalise/SKILL.md` — 6a cycle-count block: `DOC_KIND` bound; `SHAPES` by kind
- `evals/shared/tests/finalise-bug-mode.test.mjs` — parent-beside-bug case; the enumeration test's explicit `short-shape-only:` exemption

**Testing**: executed cases green under bash + zsh; mutation: task branch given both shapes → 2 red. `npm run ci:fast` 3733/3733 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 8 (Re-Review Context table of `task.125.qa.8.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: parent beside its bug counts its own report under bash + zsh.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 7 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 8 — parent beside its bug counts its own report under bash + zsh |

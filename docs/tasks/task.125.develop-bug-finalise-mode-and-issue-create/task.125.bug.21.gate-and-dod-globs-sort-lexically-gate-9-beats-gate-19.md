# Bug Report: Task 125 - 6b's new `GATE_PATH` (and the three `${STEM}.dod.*` lookups) sort lexically, so an item with ten or more gates publishes a stale verdict — `gate.9` beats `gate.19`

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-21
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-8 review CR-1 (reviewer confidence high; reproduced by QA on `docs/tasks/task.110.*`: 19 gates, `ls … | sort | tail -1` → `task.110.gate.9.*`)
**File**: `skills/finalise/SKILL.md:1611`

## Description
The cycle-7 fix (CR-3) resolved the task branch's gate path with `ls … | sort | tail -1` — the same lexical sort the cycle-5 fix (BUG-14) replaced for implementation reports with a numeric sort on N. Any work item with ≥ 10 gates (task.110 has 19; task.125 has 8 and counting) publishes the verdict of `gate.9`. The three `${STEM}.dod.*.md | sort | tail -1` lookups (6b, 7.6a, 7.6b) carry the same defect for ≥ 10 DoD files.

## Steps to Reproduce
`ls docs/tasks/task.110.*/task.110.gate.*.yml | sort | tail -1` → `gate.9` with `gate.19` on disk.

## Expected Behavior
Every numbered artefact lookup orders by its number — the `sed | sort -n | cut` pipeline BUG-14 introduced — and the lookups are zsh-safe (`find -name`).

## Actual Behavior
Lexical order; a two-digit gate loses to a one-digit one.

## Impact
A stale Final Gate in the canonical comment and the tracker `done` comment on any long-running item.

## Recommendation
One numeric-ordered lookup shape for `.gate.`, `.dod.` and `.implementation.`; a ≥ 10 fixture case for the gate.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 8)

**Root Cause**: the cycle-7 gate lookup and the cycle-2..6 DoD lookups used `ls … | sort | tail -1`, the path sort BUG-14 replaced for reports; nothing enumerated "every numbered artefact lookup".

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b carries one helper, `newest_numbered <dir> <kind> <-name patterns…>` — quoted `find -name`, the `sed | sort -n | cut` number ordering — and uses it for the DoD, the report and the gate; 7.6a and 7.6b resolve the DoD with the same pipeline. Executed: `dod.10` beats `dod.9`, `gate.19`'s verdict beats `gate.9`'s, in 6b/7.6a/7.6b under both shells.

**Files Modified**:
- `skills/finalise/SKILL.md` — `newest_numbered` helper in 6b; DoD lookups in 7.6a/7.6b
- `evals/shared/tests/finalise-bug-mode.test.mjs` — ordering case (gate.9/19, dod.9/10) across the three blocks

**Testing**: executed cases green under bash + zsh; mutation: helper's `sort -n` → `sort` → 2 red. `npm run ci:fast` 3737/3737 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 8 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

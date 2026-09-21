# Bug Report: Task 125 - `fix_cycle` is promised as a positive integer, but both qa-fix blocks use `$FIX_CYCLE_ARG` unchecked — a bad value aborts the PR-comment block where the helper path would have refused

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Diff code review CR-5 (medium confidence), verified by QA: neither block validates; `stakeholder-summary-cli.js --stage qa-fix-{N}` exits 2 → `|| exit 1`
**File**: `skills/qa-fix/SKILL.md:862`

## Description
The Pipeline Skill args section says `fix_cycle=<N>` is bound in Step 0 "as a positive integer, else empty", but Step 0 is prose and each fenced block re-binds `$FIX_CYCLE_ARG` as an input with no check. An unsubstituted `{N}`, `0`, or `3 ` yields `--stage qa-fix-{N}`, which the lead CLI rejects (exit 2); the `|| exit 1` then aborts the whole pull-request block — a failure mode the helper path (refuse, warn, post without lead) could never produce.

## Steps to Reproduce
`FIX_CYCLE_ARG='{N}' bash <tracker block>` → `--stage qa-fix-{N}` reaches tracker-comment.js (exit 2, unknown stage) instead of the refusal branch.

## Expected Behavior
An invalid `fix_cycle` is treated exactly as absent: fall through to the helper, and refuse only when both are absent.

## Actual Behavior
The value is used verbatim.

## Impact
A typo in the develop-bug verify loop's invocation turns a skipped comment into a broken step.

## Recommendation
Guard inside both blocks before the precedence `if`: `case "${FIX_CYCLE_ARG:-}" in ''|0|*[!0-9]*) FIX_CYCLE_ARG='' ;; esac`; add `[fix_cycle]` cases for `{N}` and `0` expecting the helper/refusal path (mutation: drop the guard → red).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: Both FIX_CYCLE blocks trusted `$FIX_CYCLE_ARG`; the positive-integer promise lived in prose only.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: `case "${FIX_CYCLE_ARG:-}" in ''|0|*[!0-9]*) FIX_CYCLE_ARG='' ;; esac` inside both blocks, before the precedence `if` — an invalid value reads as absent and falls through to the helper; `007` is kept as written (a number, not guessed).

**Files Modified**:
- `skills/qa-fix/SKILL.md` — both blocks
- `tests/qa-cycle.test.js` — six invalid shapes (`{N}`, `0`, `3 `, `two`, `-1`, `007x`) × (empty dir → refuses; gate on disk → derived), plus `007`

**Testing**: 7 new tests green; mutation: guard removed from the tracker block → 6 red.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 2 (Re-Review Context table of `task.125.qa.2.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: fix_cycle positive-integer guard executed in both blocks.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 2 — fix_cycle positive-integer guard executed in both blocks |

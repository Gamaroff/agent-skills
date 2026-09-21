# Bug Report: Task 125 - "Every reader accepts both report shapes" is applied by hand at three sites with nothing enumerating the readers — and finalise's cycle count reads `### QA Cycle` while every bug report writes `### Verify Cycle`

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-17
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-5 review CR-5 (reviewer confidence high; verified by QA: `grep -c '^### QA Cycle'` at finalise 6a vs `grep -h -oE '^### (QA|Verify) Cycle' docs/bugs/*/*.implementation.*.md` → 25 × `Verify Cycle`, 0 × `QA Cycle`; the verify loop's line 242 `git reset` uses `**/*.implementation.*.md` (both shapes) but line 244's `exclude={bug-prefix}.implementation.*.md` is short-only)
**File**: `skills/develop-bug/SKILL.md:341`

## Description
The cycle-4 fix states a contract — every reader of the implementation report accepts both filename shapes — and applied it at 6b, Step 3's `<IMPL_REPORT>` and develop-bug Step 0, by hand. Nothing enumerates the readers, so the next glob drifts. Two sites were missed: (a) finalise Step 6a's `CYCLES=$(grep -c '^### QA Cycle' …)` — a bug's report has only `### Verify Cycle {N}` headings, so a bug's canonical comment never carries its cycle count; (b) the verify loop's `/commit-changes` `exclude=` names the short shape only (the `git reset` beside it already covers both, so the report is un-staged but the belt is short-only).

## Steps to Reproduce
`grep -c '^### QA Cycle' docs/bugs/bug.14.*/bug.14.*.implementation.1.*.md` → 0 while the report has 5 `### Verify Cycle` headings.

## Expected Behavior
A test enumerates every `implementation.*` glob/exclude and every cycle-heading pattern across develop-bug and finalise and asserts each accepts both shapes / both heading names; 6a counts `### (QA|Verify) Cycle`; the `exclude=` names both shapes.

## Actual Behavior
Three sites fixed by hand, two missed, no floor.

## Impact
A bug's canonical comment omits its cycle count; the contract has no enforcement and will drift again.

## Recommendation
Add `evals/shared/tests/…` (or extend `finalise-bug-mode.test.mjs`) with the enumeration + non-vacuity floor (≥ 4 sites); widen the 6a grep to `^### (QA|Verify) Cycle`; widen the `exclude=`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 5)

**Root Cause**: a contract stated in prose and applied by hand has no floor; the two readers nobody listed were the cycle count (a heading-name contract, same shape) and the fix-commit exclude.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6a's cycle count greps `^### (QA|Verify) Cycle` (and drops the `|| echo 0` that produced `"0\n0"` on no match); the verify loop's `exclude=` names both shapes; a new test enumerates every non-comment line in finalise, develop-bug and its references that keys `implementation.*` on `{bug-prefix}`/`${STEM}` (floor ≥ 4) and asserts each names both shapes; the cycle-count lines are executed against `Verify Cycle`, `QA Cycle` and no-heading fixtures.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6a cycle count
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` — `exclude=` both shapes
- `evals/shared/tests/finalise-bug-mode.test.mjs` — enumeration test; executed cycle-count cases

**Testing**: executed cases green under bash + zsh; mutation: cycle grep back to `QA Cycle` only → 2 red; `exclude=` back to one shape → 1 red. `npm run ci:fast` 3724/3724 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 6 (Re-Review Context table of `task.125.qa.6.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: cycle count = 3 on a real Verify-Cycle report; enumeration test green.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 5 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 6 — cycle count = 3 on a real Verify-Cycle report; enumeration t… |

# Bug Report: Task 125 - `CYCLES` is computed in the 6a block and consumed by 6b's comment body — another block — so under the skill's own per-block rule it is unbound there and the QA Cycles line is silently omitted at exit 0

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-22
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-8 review CR-2 (reviewer confidence medium; verified by QA: `[ "" -gt 0 ]` → `integer expected` → `|| true` → empty line, exit 0)
**File**: `skills/finalise/SKILL.md:1536`

## Description
Every fenced block runs as its own shell (TASK-121-BUG-2) — the rule this task's BUG-12/15 fixes are built on. The cycle-count derivation lives in "Step 6a — Resolve QA cycle count", its own block, and 6b's body reads `$([ "$CYCLES" -gt 0 ] && echo "**QA Cycles**: ${CYCLES}" || true)`. With `CYCLES` unbound the test errors, `|| true` swallows it, and the line is omitted — "0 cycles" and "never counted" produce the same comment. The cycle-6/7 work on the 6a block was therefore inert on any run that executed the blocks as documented. The two-shape locator also now exists twice in adjacent blocks (cycle-8 CR-4).

## Steps to Reproduce
Run 6b's body line with `CYCLES` unset → `[: : integer expected`, empty line, rc 0.

## Expected Behavior
The cycle count is derived inside 6b, after its STEM/DOC_KIND cross-check, from the report 6b already locates — one locator, one block, no carried value.

## Actual Behavior
Two blocks; the second cannot see the first's result.

## Impact
The canonical summary never carries the cycle count.

## Recommendation
Fold the derivation into 6b; delete the separate 6a block; keep the executed cases against 6b.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 8)

**Root Cause**: the cycle count lived in its own fenced block and 6b consumed the value across the block boundary the skill itself says nothing crosses.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: the separate 6a block is gone; 6b locates the report once (by kind — full-stem shape bug-only) after its STEM/DOC_KIND cross-check and the DoD check, derives `CYCLES` from it, and in bug mode reads the verdict from the same file — one locator, one block. The executed derivation now prints `CYCLES`, pinned in the bug case; the cycle-count test slices 6b.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6a block folded into 6b; second locator removed (cycle-8 CR-4)
- `evals/shared/tests/finalise-bug-mode.test.mjs` — `CYCLES=2` pinned in the 6b bug case; cycle-count cases against 6b's slice

**Testing**: executed cases green under bash + zsh; mutation: CYCLES derivation removed from 6b → 4 red. `npm run ci:fast` 3737/3737 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 8 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

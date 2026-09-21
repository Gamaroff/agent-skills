# Bug Report: Task 125 - 6b reads `${STEM}` bound in 6a — another fenced block — and with STEM unbound it silently publishes an empty DoD path and empty Final Gate

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-15
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-5 review CR-2 (reviewer confidence high; reproduced by QA: the 6b block run with STEM unset under bash and zsh → `DOD_PATH=[] FINAL_GATE=[] DOC_KIND=[task]`, exit 0)
**File**: `skills/finalise/SKILL.md:1481`

## Description
6b's comment says "STEM is bound at 6a", the block above it, while the next comment states that every fenced block runs as its own shell and inherits nothing (TASK-121-BUG-2) — the very reason `DOC_KIND` was re-bound in-block for BUG-12. With `STEM` empty, `DOD_PATH` globs `dir/.dod.*.md` (nothing), the cycle-4 STEM-vs-flag cross-check cannot fire, the task branch runs, `FINAL_GATE` is empty, and the canonical comment posts with both fields blank. The executed 6b test injects `STEM` through `env`, so it cannot see this — the BUG-12 shape one variable over.

## Steps to Reproduce
Extract the 6b block, run it with only `DIR` bound (no `STEM`), under bash or zsh: exit 0, `DOD_PATH=` and `FINAL_GATE=` empty, `DOC_KIND=task`.

## Expected Behavior
6b binds `STEM` itself as a substituted placeholder (as 6a does) and HALTs on an empty value before deriving anything; the test runs the block with `STEM` unset and asserts the HALT.

## Actual Behavior
A silent, well-formed canonical comment with no DoD path and no gate.

## Impact
The single most visible artefact of a finalise run — the canonical PR comment — can publish blank on an agent that ran 6b without re-binding a variable the block never names as an input.

## Recommendation
Add `STEM="{… the same placeholder as 6a}"` at the top of 6b and `[ -n "$STEM" ] || { echo HALT…; exit 1; }`; add the executed STEM-unset case.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 5)

**Root Cause**: 6b's `STEM` was a variable inherited from 6a's shell on the strength of a comment; the block that re-bound `DOC_KIND` for exactly this reason (BUG-12) left `STEM` as it was, and the executed test injected `STEM` through `env`, so an unbound one could not go red.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b, 6a and 7.6b each carry `STEM="{…}"` and `DOC_KIND="{story | task | bug — …}"` as substituted placeholders, followed by `[ -n "$STEM" ] && [ -n "$DOC_KIND" ] || HALT`; the `$*` line in 6b is gone (the kind is an input, not argv — cycle-5 CR-3), and the kind block reads the flag from a `BUG_FLAG` placeholder beside argv. The test harness substitutes the placeholders from env and runs the block with each unset.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b, 6a, 7.6b re-bind + HALT; kind block `BUG_FLAG`; `pr-comment` marker prose
- `evals/shared/tests/finalise-bug-mode.test.mjs` — harness feeds `STEM_IN`/`KIND_IN`; STEM-unset → HALT (6b, 6a, 7.6b); `BUG_FLAG` with no argv → bug

**Testing**: executed cases green under bash + zsh; mutation: 6b non-vacuity HALT removed → 2 red; `$BUG_FLAG` dropped from the kind case → 2 red. `npm run ci:fast` 3724/3724 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 5 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

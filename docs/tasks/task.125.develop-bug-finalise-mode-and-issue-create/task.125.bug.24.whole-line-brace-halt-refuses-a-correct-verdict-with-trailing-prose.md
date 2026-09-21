# Bug Report: Task 125 - The cycle-9 whole-line `{` check HALTs a correct verdict whose trailing prose names a `{placeholder}`, while `PASS / FAIL` with its braces dropped still publishes PASS

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-24
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-10 review CR-1 + CR-2 (reviewer confidence high / medium; both reproduced by QA under bash: `**Verdict**: PASS — the \`{bug-prefix}\` reader now accepts both shapes` → HALT "unsubstituted template placeholder"; `**Verdict**: PASS / FAIL` and `PASS/FAIL` → `FINAL_GATE=PASS`, exit 0)
**File**: `skills/finalise/SKILL.md:1609`

## Description
The BUG-23 fix added two guards: a whole-line `case … in *'{'*` HALT and a first-word extraction. The first fires on any brace anywhere — and this repository's verify-loop verdict lines routinely carry trailing prose naming a `{placeholder}` — so a correct bug run HALTs with a misleading diagnostic; the cycle-9 mutation had already shown the arm to be absorbed by the second guard (the first-word rule refuses `{PASS / FAIL}` on its own). Meanwhile the template's own placeholder with only its braces dropped — `PASS / FAIL`, `PASS/FAIL` — has `PASS` as its first word and is published.

## Steps to Reproduce
See Source. Both under bash; the reviewer reproduced under zsh as well.

## Expected Behavior
One refusal path: the verdict is the first word after the colon with bold stripped, exactly `PASS`/`FAIL`; a line whose remainder begins with `/` or `|` (the template's alternation) is refused as a template remnant; braces elsewhere on the line are prose. The HALT text says whether no verdict line exists or one exists and was refused (naming it) — cycle-10 CR-3.

## Actual Behavior
A brace in trailing prose HALTs; a brace-less template remnant passes.

## Impact
A correct bug run halts at 7.7; a template remnant closes a bug as accepted.

## Recommendation
Drop the whole-line brace check; refuse an alternation remainder; branch the diagnostic; the refused-verdict tests assert the diagnostic per case (CR-4).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 10)

**Root Cause**: the cycle-9 fix stacked a whole-line check on top of a first-word rule; the first over-reached (any brace), the second under-reached (a remnant whose first word is PASS).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: one refusal path — the first word after the colon with bold stripped must be exactly `PASS`/`FAIL`, AND what follows it must not begin with `/` or `|` (the template's alternation). No whole-line brace check. Two diagnostics: "no verdict line found" when none exists, "is not an exact PASS or FAIL: <line>" when one was refused (CR-3). Executed: 7 refused shapes (each asserting the refusing diagnostic — CR-4) and 5 accepted shapes including two with a `{placeholder}` in trailing prose.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b verdict extraction
- `evals/shared/tests/finalise-bug-mode.test.mjs` — the verdict case rewritten (7 refused / 5 accepted, diagnostics asserted)

**Testing**: mutations: alternation refusal removed → 2 red; whole-line brace HALT re-introduced → 2 red; diagnostics collapsed → 2 red. `npm run ci:fast` 3741/3741 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; re-introduce a whole-line `*'{'*` HALT and confirm the trailing-prose cases go red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 10 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

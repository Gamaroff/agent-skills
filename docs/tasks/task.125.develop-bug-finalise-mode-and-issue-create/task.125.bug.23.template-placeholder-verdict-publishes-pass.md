# Bug Report: Task 125 - A `**Verdict**:` line left as the verify-loop template's own placeholder (`{PASS / FAIL}`) publishes `FINAL_GATE=PASS` at exit 0

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-23
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-9 review CR-1 (reviewer confidence medium; verified by QA: `printf '**Verdict**: {PASS / FAIL}\n' | grep -oE 'PASS|FAIL' | head -1` → `PASS`; the template line is `develop-bug-step-5-6-verify-loop.md:67`)
**File**: `skills/finalise/SKILL.md:1598`

## Description
The cycle-4 fix (CR-3) reads the bug's verdict as the first `PASS|FAIL` token on the last `**Verdict**:` line. The verify-loop template's QA Iteration History entry is written with `**Verdict**: {PASS / FAIL}` for the agent to substitute; an entry left unsubstituted — the placeholder class this task has been closing all along — yields `PASS`, and the canonical comment and the tracker `done` comment publish a bug as accepted on a verdict nobody wrote.

## Steps to Reproduce
`printf '**Verdict**: {PASS / FAIL}\n' | grep -oE 'PASS|FAIL' | head -1` → `PASS`.

## Expected Behavior
A verdict line containing `{` is refused (HALT naming the report), exactly as the block's own inputs are; the first token after the colon, bold stripped, must be exactly `PASS` or `FAIL`.

## Actual Behavior
`PASS`, exit 0.

## Impact
A bug closed as accepted from a template placeholder.

## Recommendation
Refuse a verdict line containing `{`; extract the first token after the colon with `*` stripped and HALT unless it is exactly `PASS`/`FAIL`; fixture case with the placeholder line.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 9)

**Root Cause**: the cycle-4 verdict extraction searched the whole line for a PASS/FAIL token; the verify-loop template's placeholder carries both.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b reads the last `**Verdict**:` line into `VERDICT_LINE`, HALTs when it contains `{` (the template placeholder, named in the diagnostic), and takes the verdict as the FIRST word after the colon with `*` stripped — accepted only when it is exactly `PASS` or `FAIL`, otherwise cleared into the existing "no verdict" HALT. Executed: `{PASS / FAIL}`, `pending — PASS expected` and `**PASSED**` all HALT; `**FAIL**`, `FAIL — fix cycle 2` and `PASS — proceeding to Step 7` still read.

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b verdict extraction
- `evals/shared/tests/finalise-bug-mode.test.mjs` — three refused shapes, three accepted shapes × bash + zsh

**Testing**: mutation: first-word extraction reverted to the token grep → 2 red (**covered**); brace arm removed → green (**absorbed** — the exact-token check already refuses the placeholder; the arm is kept for its diagnostic). `npm run ci:fast` 3741/3741 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; revert the `sed` first-word extraction to `grep -oE 'PASS|FAIL'` and confirm the placeholder case goes red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 9 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

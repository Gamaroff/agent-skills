# Bug Report: Task 125 - 6b's bug branch keys on `DOC_KIND` and `VERIFY_VERDICT`, neither of which any command binds in that block — and the executed fixture test injects both, so it passes vacuously on exactly that gap

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-3 review CR-1 (reviewer confidence medium; verified by QA: `grep -n 'VERIFY_VERDICT=' skills/finalise/SKILL.md` → no assignment anywhere; the Step 2 marker says "bind `VERIFY_VERDICT`" in prose)
**File**: `skills/finalise/SKILL.md:1480`

## Description
The 6b derivation branches on `$DOC_KIND` and reads `${VERIFY_VERDICT:-N/A}`. `DOC_KIND` is assigned by the Document-kind block ~1400 lines earlier; `VERIFY_VERDICT` is assigned by no command at all — the Step 2 `qa-reports` marker asks the reader to "bind" it in prose. Every fenced block runs as its own shell (TASK-121-BUG-2), so in the 6b shell an unbound `DOC_KIND` silently takes the story/task branch (a stem-scoped gate glob that never matches a bug → blank `FINAL_GATE`), and `${VERIFY_VERDICT:-N/A}` reports the same `N/A` for "never bound" and a genuine N/A. The executed fixture test in `finalise-bug-mode.test.mjs` sets all three through `env`, so it cannot see this.

## Steps to Reproduce
Run the 6b lines in a fresh shell over the fixture without pre-setting `DOC_KIND` / `VERIFY_VERDICT`: the task branch runs, `FINAL_GATE` is empty (or `N/A`), and nothing says the verdict was never derived.

## Expected Behavior
The 6b block re-binds `DOC_KIND` in-block from the invocation args (the same `case " $* "` line) and derives `VERIFY_VERDICT` in-block from the implementation report's last `**Verdict**:` line, HALTing (or warning loudly) when bug mode yields an empty verdict; the test runs the block without pre-setting those variables.

## Actual Behavior
Both are inputs the prose expects an agent to carry across blocks; one has no binding command at all; the test proves the happy path only.

## Impact
On a bug run the canonical PR comment can publish an empty verdict or the task-branch derivation without any signal that the bug branch did not run.

## Recommendation
In-block: `case " $* " in *" --bug "*) DOC_KIND=bug ;; *) DOC_KIND=${DOC_KIND:-task} ;; esac`; `VERIFY_VERDICT=$(grep -E '^\*\*Verdict\*\*:' "$IMPLEMENTATION_REPORT" | tail -1 | awk '{print $2}')` with `IMPLEMENTATION_REPORT` resolved by glob beside the document; in bug mode an empty verdict is a HALT naming the report. Rewrite the fixture test to run the block with only `DIR`, argv and an implementation-report fixture — no injected `DOC_KIND`/`VERIFY_VERDICT` — and add the unbound case: no `--bug` → task branch.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 3)

**Root Cause**: The 6b block inherited `DOC_KIND` from the Document-kind block and `VERIFY_VERDICT` from a prose instruction in the Step 2 marker; neither is bound by a command in 6b's own shell, and the fixture test set both through `env`, so the happy path was the only path it could see.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 6b now re-binds `DOC_KIND` from the invocation args with the same `case " $* "` line the kind block uses (`*)` keeps a bound value or defaults to `task`), and in bug mode derives `VERIFY_VERDICT` in-block — the last `**Verdict**:` line of `${STEM}.implementation.*.md` beside the bug — HALTing (exit 1, naming the report) when none exists, so "never bound" can no longer read as `N/A`. The Step 2 marker no longer claims to bind it. The `pr-comment` marker describes the block. (CR-2 in the same block: `HEAD_DESC` / `CLOSING_LINE` branch on the kind, so a bug run's PR comment no longer says "the commit carrying `status: accepted`" / "Story/task accepted".)

**Files Modified**:
- `skills/finalise/SKILL.md` — 6b block (re-bind, in-block derivation, HALT, kind-branched body lines); `pr-comment` and `qa-reports` markers
- `evals/shared/tests/finalise-bug-mode.test.mjs` — the 6b test injects NOTHING but `DIR` and `STEM`: `--bug` on argv + a fixture implementation report → the bug's DoD, the LAST verdict, the bug closing line; no flag → the task branch; `--bug` with no `**Verdict**` line → HALT exit 1

**Testing**: 3 executed cases × bash + zsh green; mutations: in-block re-bind removed → 6 red; HALT replaced by `${VERIFY_VERDICT:-N/A}` → 2 red; closing line made unconditional → 2 red. `npm run ci:fast` 3697/3697 (the `$2` in the new awk was rewritten `$(2)` for the positional-token guard).

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; revert the `case " $* "` re-bind and confirm the 6b cases go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 3 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

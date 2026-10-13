# Bug Report: Task 182 - the hooks doc says both re-entry scripts set qa_phase to 5a

**Task**: [task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md](./task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)
**Bug ID**: TASK-182-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-1 / TASK-182-001)
**Date Found**: 2026-10-13

## Description

Task 182 rewrote `shared/resources/develop-pipeline-hooks.md:86` to state each QA-loop lock field's writers exactly. The new sentence says `qa_phase` "is written by `set-qa-phase.sh` inside the loop and by both re-entry scripts, which set it to `5a`". `grant-qa-cycles.sh` does not always write `5a`: it writes `5b` after a not-converging halt (`grant-qa-cycles.sh:232-237`, `case "$HALT_REASON" in not-converging … REENTER=5b`). The fix meant to make the writer list accurate introduced a new inaccurate claim. The same paragraph's trailing "reads neither" no longer fits the three fields it now lists.

## Steps to Reproduce

`grep -n 'which set it to' shared/resources/develop-pipeline-hooks.md` and `sed -n 225,238p shared/resources/grant-qa-cycles.sh`.

## Expected Behavior

The hooks doc says `grant-qa-cycles.sh` writes `5b` after a not-converging halt and `5a` otherwise, and `reenter-qa-after-finalise.sh` always writes `5a`.

## Actual Behavior

It says both re-entry scripts write `5a`.

## Impact

A reader debugging a resumed not-converging run is told the lock should read `5a` when `5b` is correct, which is the misreading obs #228 fixed in the code. The parity test does not catch it: it pins the writers' names, not the value.

## Recommendation

Correct the sentence (`5b` after not-converging, else `5a`; reenter always `5a`), fix "reads neither" to "reads none of them", and pin the `5b` clause in `qa-loop-lock-fields-parity.test.mjs` so the doc cannot revert it silently.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-13

**Root Cause**: The Phase 3 rewrite listed the re-entry scripts together and gave them one `qa_phase` value; only `reenter-qa-after-finalise.sh` always writes `5a`. `grant-qa-cycles.sh` chooses `5b` on a not-converging halt (`grant-qa-cycles.sh:232-238`, obs #228). The parity test pinned the writers' names, not the value, so it passed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-13

**Fix Description**:
- `develop-pipeline-hooks.md:86`: `grant-qa-cycles.sh` writes `5b` after a not-converging halt and `5a` otherwise; `reenter-qa-after-finalise.sh` always writes `5a`. "reads neither" → "reads none of them".
- The Step 3.5 population probe (`qa_phase: 5a`) found the same false claim, pre-existing on `origin/develop`, in both `skills/develop-{task,story}/SKILL.md` ("writes … `qa_phase: 5a` atomically" for the grant): corrected to "`qa_phase` (`5b` after a not-converging halt, else `5a`)".
- `qa-loop-lock-fields-parity.test.mjs`: pins the hooks-doc `5b` clause, both SKILL.md grant sentences, and that `grant-qa-cycles.sh` still writes `5b` after not-converging.

**Files Modified**: `shared/resources/develop-pipeline-hooks.md` (+3 bundled copies), `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.

**Testing**: parity tests 12/12. Mutation-proven: hooks sentence reverted to "both set it to `5a`" → red; develop-story SKILL.md grant sentence reverted → red.

**Verification Steps for QA**:
1. `grep -n "writes \`5b\`" shared/resources/develop-pipeline-hooks.md`
2. `command node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-13

**QA Reopening Reason**: task.182.qa.2 (TASK-182-003) — the pause reference's lock schema (`develop-pipeline-pause.md:113`) still said both re-entry writers set `5a`; iteration 1 corrected three sites and missed this one. The refute pass also found iteration 1's own wording imprecise (CR-4): `grant-qa-cycles.sh` reads `halt_reason` only from a snapshot it restores, so with a live lock it writes `5a` whatever halted.

**Revised Approach**: consolidate, not patch a fourth site (qa-fix Step 2.6, trigger (b) — a repeated subject). The pause reference's `qa_phase` row is now the one statement of which value each writer sets; the hooks doc and both SKILL.md cite it and state no value.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-13

**Fix Description**:
- `develop-pipeline-pause.md` `qa_phase` row: `grant-qa-cycles.sh` writes `5b` when it restores from a not-converging halt snapshot and `5a` otherwise (a loop-limit halt, or a lock that already exists); `reenter-qa-after-finalise.sh` always writes `5a`.
- `develop-pipeline-hooks.md` and both `skills/develop-{task,story}/SKILL.md`: cite that row; no value restated.
- `qa-loop-lock-fields-parity.test.mjs`: pins the row, and fails any other describer that restates a writer's value (`VALUE_CLAIM`, measured against every historic false statement on `origin/develop`, `b7d7661e` and `4eb35d36`; non-vacuity floor of 6 describers).

**Testing**: parity 12/12. Mutation-proven: the row's 5b clause flipped to 5a → red; a value restated in the hooks doc → red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-13 | New | qa-task | Filed by task.182.qa.1 |
| 2026-10-13 | In Progress | qa-fix | Investigation started (QA cycle 1 fix) |
| 2026-10-13 | Ready for QA | qa-fix | Hooks doc and both SKILL.md corrected; parity pins added |
| 2026-10-13 | Reopened | qa-task | Not fixed — pause-doc lock schema still says both writers set 5a (task.182.qa.2, TASK-182-003) |
| 2026-10-13 | In Progress | qa-fix | Iteration 2 — consolidating the qa_phase writer rule |
| 2026-10-13 | Ready for QA | qa-fix | One statement in the pause lock schema; hooks doc and both SKILL.md cite it; parity test holds it |

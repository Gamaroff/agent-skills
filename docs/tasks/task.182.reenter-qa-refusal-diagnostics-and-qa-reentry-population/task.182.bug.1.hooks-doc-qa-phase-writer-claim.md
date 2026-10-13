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

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-13 | New | qa-task | Filed by task.182.qa.1 |
| 2026-10-13 | In Progress | qa-fix | Investigation started (QA cycle 1 fix) |
| 2026-10-13 | Ready for QA | qa-fix | Hooks doc and both SKILL.md corrected; parity pins added |

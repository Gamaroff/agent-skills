# Bug Report: Task 125 - The Document-kind block's own substituted inputs (`BUG_FLAG`, `DOC_FILE`) have no verbatim-placeholder guard, so a `/finalise --bug` run with the placeholders left in place resolves DOC_KIND=task at exit 0

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-20
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-7 review CR-2 (reviewer confidence high; reproduced by QA: the kind block executed with `BUG_FLAG`/`DOC_FILE` verbatim and no argv → `DOC_KIND=[task]` exit 0)
**File**: `skills/finalise/SKILL.md:55`

## Description
Cycle 6 (CR-3) taught 6a, 7.6b and 6b to refuse a value containing `{`; the Document-kind block — the one that decides the kind for the whole skill and whose inputs are also substituted placeholders (`BUG_FLAG` since cycle 5, `DOC_FILE` from the start) — was not given the same guard. Left verbatim, `case " $* $BUG_FLAG "` cannot match `--bug` (the brace precedes it) and `basename "{the document path argument}"` matches the `*)` arm, so the run continues as a TASK with only a hint — reaching the Change Log writer that bug mode forbids, which is the mode's stated rollback trigger.

## Steps to Reproduce
Extract the kind block, run it with no argv and the two placeholders unsubstituted → `DOC_KIND=task`, exit 0.

## Expected Behavior
The block HALTs on an unsubstituted `BUG_FLAG` or `DOC_FILE`, exactly as the three later blocks do on `STEM`/`DOC_KIND`; the executed kind-block test carries the verbatim case expecting exit 1.

## Actual Behavior
Continues as task with a hint.

## Impact
A bug run that skipped substitution takes the task path silently — the class every cycle of this task has been closing.

## Recommendation
`case "$BUG_FLAG$DOC_FILE" in *'{'*) HALT ;; esac` in the kind block; verbatim case in the executed test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 7)

**Root Cause**: cycle 6's verbatim-placeholder guard was applied to the three Step 7 blocks and not to the block that decides the kind for all of them, whose inputs are the same kind of substituted placeholder.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: `case "$BUG_FLAG$DOC_FILE" in *'{'*) HALT` after both are bound and before either is read; the executed kind-block test runs the block with NO substitution and expects exit 1 and no kind.

**Files Modified**:
- `skills/finalise/SKILL.md` — Document-kind block guard
- `evals/shared/tests/finalise-bug-mode.test.mjs` — verbatim kind-block case × bash + zsh

**Testing**: executed cases green under bash + zsh; mutation: kind-block guard removed → 2 red. `npm run ci:fast` 3733/3733 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 8 (Re-Review Context table of `task.125.qa.8.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: verbatim kind block HALTs exit 1.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 7 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 8 — verbatim kind block HALTs exit 1 |

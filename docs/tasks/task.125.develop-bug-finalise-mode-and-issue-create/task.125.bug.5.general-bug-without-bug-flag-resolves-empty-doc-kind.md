# Bug Report: Task 125 - `/finalise <general-bug-file>` without `--bug` resolves `DOC_KIND` to the empty string — a third, undefined kind

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: QA Step 4b execution of the Document-kind block under bash and zsh (6 inputs × 2 shells)
**File**: `skills/finalise/SKILL.md:49`

## Description
The kind-resolution block sets `DOC_KIND` from the basename prefix (`story.*` / `task.*`) and only prints a hint for a bug path. A general bug (`bug.14.name.md`) matches neither prefix, so with no `--bug` the block ends with `DOC_KIND=""` and the hint reads "continuing in  mode as invoked" (two spaces, no kind). Every later branch on `DOC_KIND` then sees a value the prose never defines.

## Steps to Reproduce
Executed: `bash kind-block.sh docs/bugs/bug.14.x/bug.14.precompact.md` → `hint: … continuing in  mode as invoked` and `DOC_KIND=` (identical under zsh). A story bug or task bug resolves to `story`/`task` as intended.

## Expected Behavior
Without the flag, a general bug continues in a defined kind (the pre-task.125 behaviour was the story/task DoD — `task` is the closest shape) and the hint names it.

## Actual Behavior
`DOC_KIND` is empty and the hint sentence has a hole in it.

## Impact
`/finalise` on a general bug without the flag — the exact invocation the hint exists for — runs with an undefined kind; the breaking-changes promise ("`/finalise <bug-file>` without `--bug` continues to do what it does today") is not met for general bugs.

## Recommendation
Default `DOC_KIND=task` when the basename matches neither prefix (`*) DOC_KIND=task ;;`), so the hint reads "continuing in task mode"; add the general-bug-no-flag case to `finalise-bug-mode.test.mjs` by executing the block (it is bash — extract and run it) rather than grepping it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: The `case` on the basename had arms for `story.*` and `task.*` only; a general bug matched neither, left `DOC_KIND` empty, and the hint sentence printed the empty kind.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: Added `*) DOC_KIND=task ;;` — the DoD every general-bug run took before task.125 — so the hint reads `continuing in task mode as invoked` and every later branch sees a defined kind.

**Files Modified**:
- `skills/finalise/SKILL.md` — Document-kind block
- `evals/shared/tests/finalise-bug-mode.test.mjs` — the block is now EXECUTED (extracted, argv-substituted, bash + zsh) over seven inputs asserting the kind and whether a hint fires

**Testing**: Executed test green in both shells; mutation: default arm removed → 2 red (bash, zsh). ci:fast green.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 2 (Re-Review Context table of `task.125.qa.2.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: kind block executed under bash + zsh: bug.* without --bug → task.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 2 — kind block executed under bash + zsh: bug.* without --bug → … |

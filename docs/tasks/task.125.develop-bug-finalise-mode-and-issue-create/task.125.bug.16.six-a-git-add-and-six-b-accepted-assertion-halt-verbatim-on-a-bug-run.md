# Bug Report: Task 125 - 6a's `git add` names `sprint-review-summary.md` and 6b asserts `status: accepted` — both HALT verbatim on every bug run, with the bug variant only in marker prose

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-16
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-5 review CR-4 (reviewer confidence medium; verified by QA by reading lines 1199 and 1257 against the `acceptance-commit` / `pushed-assertions` markers at 1232 and 1263, which describe a different artefact list and a *replaced* assertion in prose)
**File**: `skills/finalise/SKILL.md:1199`

## Description
Step 7.6a's block runs `git add "{document-path}" "…/${STEM}.dod."*.md "…/sprint-review-summary.md"` and HALTs on a non-zero exit; the bug-mode marker says the add names "the bug report and the DoD file only — no sprint-review-summary.md (skipped, so the pathspec would abort the add)". Step 7.6b's block ends with `git show … | grep -q '^status: accepted$' || HALT`; its marker says the assertion "is replaced by" a `## Verification Complete` check. Neither block carries the branch: executed as written, a bug run aborts at 6a, and if an agent edits 6a by hand it aborts at 6b. This is "bound by prose, never bound at all" — the class this same diff's BUG-12 fix names for 6b.

## Steps to Reproduce
Run 7.6a verbatim in bug mode: `git add …/sprint-review-summary.md` → pathspec did not match → HALT. Run 7.6b verbatim: the bug file has no `status: accepted` → HALT.

## Expected Behavior
Both blocks branch on the re-bound kind in-block — the artefact list and the final assertion as variables — so the block runs unedited in either mode, with an executed bug-mode case for each.

## Actual Behavior
The blocks HALT; the bug variants exist only as prose beside them.

## Impact
`finalise --bug`, the only DoD path develop-bug has, cannot complete 7.6a/7.6b without the agent rewriting two blocks from prose.

## Recommendation
In 6a: `ARTEFACTS=(…)` chosen by `DOC_KIND`; in 6b: `FINAL_ASSERT` chosen by `DOC_KIND` (`^status: accepted$` on the document vs `^## Verification Complete` on `$DOD_PATH`); executed tests for both in bug mode.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 5)

**Root Cause**: the bug variants of 7.6a (artefact list, commit message) and 7.6b (artefact list, final assertion) were written as prose beside the blocks when `--bug` was added, so the blocks themselves still HALTed on the sprint review and the `status: accepted` assertion.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: 7.6a chooses `ADD_PATHS` and `COMMIT_MSG` by `DOC_KIND` in-block (`docs(${STEM}): DoD verified — finalise --bug` for a bug; no sprint review); 7.6b chooses `ARTIFACTS`, `FINAL_ASSERT_PATH` and `FINAL_ASSERT_PATTERN` in-block (`^## Verification Complete` on `$DOD_PATH` for a bug). Each block carries a `# --- … resolved ---` marker the executed test slices to, so the derivation runs without git. The two marker notes now describe the branch instead of instructing an edit.

**Files Modified**:
- `skills/finalise/SKILL.md` — 7.6a and 7.6b blocks + their bug-mode notes
- `evals/shared/tests/finalise-bug-mode.test.mjs` — 7.6a bug/task artefact lists + messages; 7.6b bug/task artefact lists + assertion (× bash + zsh)

**Testing**: executed cases green under bash + zsh; mutation: 6a bug branch collapsed to the task list → 2 red; 7.6b bug assertion reverted to `status: accepted` → 2 red. `npm run ci:fast` 3724/3724 (1 pre-existing skip); `bundle:check` 0 problems.

**Verification Steps for QA**:
1. Run `evals/shared/tests/finalise-bug-mode.test.mjs`; apply the mutation named above and confirm the red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 5 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

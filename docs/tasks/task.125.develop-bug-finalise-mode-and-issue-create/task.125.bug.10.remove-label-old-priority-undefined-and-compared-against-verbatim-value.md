# Bug Report: Task 125 - The four sync-github-* edits pass `--remove-label "$OLD_PRIORITY_LABEL_IF_DIFFERENT"`, a variable no block defines — and any ad-hoc derivation against the verbatim frontmatter value now removes the label the filtered `--add-label` just added

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-2 refute review CR-3; verified by grep: `OLD_PRIORITY_LABEL_IF_DIFFERENT` is assigned nowhere in sync-github-{bug,story,task,epic}
**File**: `skills/sync-github-bug/SKILL.md:139`

## Description
Each edit block ends with `--remove-label "$OLD_PRIORITY_LABEL_IF_DIFFERENT"`. Nothing defines it, so an agent derives it by hand — and the obvious derivation ('the issue's current `priority:*` label if it differs from `priority:${PRIORITY}`') compares against the frontmatter's case. With frontmatter `High` and the issue carrying `priority:high`, 'different' fires and gh receives `--add-label priority:high --remove-label priority:high`: add then remove, stripping the label on every re-sync. Pre-existing undefined variable; this diff's lowercasing is what makes the misfire likely.

## Steps to Reproduce
Frontmatter `priority: High`; issue label `priority:high`; run the sync-github-bug edit with the ad-hoc derivation.

## Expected Behavior
The removal is computed against the FILTERED new label (what `gh_labels_filter` emitted) and passed only when the issue's current `priority:*` label differs from it.

## Actual Behavior
Undefined variable; verbatim comparison.

## Impact
Every re-sync of a document whose frontmatter case differs from the repo convention strips its priority label.

## Recommendation
Define the derivation in each edit block: capture the filtered lines, take the `priority:*` one as `NEW_PRIORITY`, read the issue's current `priority:*` label, and build `REMOVE_ARGS=(--remove-label "$OLD")` only when `OLD` is non-empty and differs from `NEW_PRIORITY`; add an executed test with a fake gh for the `High` vs `priority:high` case.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 2)

**Root Cause**: `OLD_PRIORITY_LABEL_IF_DIFFERENT` was a placeholder no block ever assigned; after cycle 1 lowercased the add side, any verbatim-case derivation removed the label just added.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: Each of the four sync edit blocks now derives it explicitly: `NEW_PRIORITY` = the `priority:*` line the helper emitted; `OLD_PRIORITY` = the issue's current `priority:*` label (`gh issue view --json labels`) when it differs from `NEW_PRIORITY`; `REMOVE_ARGS=(--remove-label "$OLD")` only when both exist. `"${REMOVE_ARGS[@]}"` replaces the undefined variable.

**Files Modified**:
- `skills/sync-github-bug/SKILL.md`, `skills/sync-github-story/SKILL.md`, `skills/sync-github-task/SKILL.md`, `skills/sync-github-epic/SKILL.md`
- `tests/gh-labels.test.js` — `[remove-label]` ×3: the sync-github-bug edit block EXECUTED with a fake gh (`label list` + `issue view`) and a `node` shim — High vs `priority:high` → no removal; medium → high → removes medium; helper drops the new label → no removal

**Testing**: 3 tests green; mutation: comparison switched back to the verbatim `priority:${PRIORITY}` → 1 red (the label is removed). Bundled copies unchanged (prose only).

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 3 (Re-Review Context table of `task.125.qa.3.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: --remove-label derived against the filtered label; executed ×3.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 2 (refute pass) |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 3 — --remove-label derived against the filtered label; executed … |

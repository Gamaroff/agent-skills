# Bug Report: Task 125 - finalise Step 2 in bug mode globs `{story-directory}/*.qa.*.md` / `*.gate.*.yml`, which for a story or task bug is the parent's directory — the parent's QA record is read as the bug's

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-2 refute review CR-2 (verified: Step 2 lines 226–227 glob the directory; the `qa-reports` marker tells the reader to ingest whatever it finds)
**File**: `skills/finalise/SKILL.md:230`

## Description
The `qa-reports` bug-mode marker says a bug directory carries no gate and, when one is found, to read it 'exactly as on the story/task path'. Story and task bugs are co-located with their parent, whose `*.qa.*.md` and `*.gate.*.yml` match the Step 2 globs — so the parent's QA report and gate become the bug's QA record on every story-bug and task-bug run.

## Steps to Reproduce
Task bug in `docs/tasks/task.67.x/`; Step 2's `*.gate.*.yml` glob returns `task.67.gate.2.*.yml`.

## Expected Behavior
Bug mode scopes the Step 2 globs to `${STEM}.qa.*.md` / `${STEM}.gate.*.yml`, and says a parent's artefacts in the same directory are not the bug's evidence.

## Actual Behavior
Directory-wide globs.

## Impact
A bug's DoD cites a gate written about its parent; the acceptance decision reads that gate's verdict.

## Recommendation
Scope the globs by stem in the `qa-reports` marker (one line each) and state the exclusion; cover it in the same executed fixture test as BUG-8.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 2)

**Root Cause**: The `qa-reports` marker left Step 2's directory-wide globs in place and told the reader to ingest whatever they returned.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: The marker now scopes both globs to `${STEM}.qa.*.md` / `${STEM}.gate.*.yml`, names the parent-directory hazard, and binds `VERIFY_VERDICT` from the implementation report's last `**Verdict**` for 6b; the skip-table row and the bug DoD template's Step 1 block say the same.

**Files Modified**:
- `skills/finalise/SKILL.md` — `qa-reports` marker + table row
- `skills/finalise/assets/bug-dod-template.md` — Step 1 placeholder names the bug's own stem
- `evals/shared/tests/finalise-bug-mode.test.mjs` — asserts the marker carries both stem-scoped globs and names the parent hazard

**Testing**: Test green; the marker is prose (the Step 2 globs are the story/task path's own lines, unchanged for that path).

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 2 (refute pass) |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

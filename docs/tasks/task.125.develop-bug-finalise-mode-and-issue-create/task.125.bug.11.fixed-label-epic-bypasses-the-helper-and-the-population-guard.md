# Bug Report: Task 125 - Enumeration risk: the population guard matches only document-field labels, so `ensure-epic-github-issue`'s verbatim `--label "epic"` bypasses the helper — a repository without an `epic` label loses the whole epic create by the obs #65 mechanism

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Cycle-2 refute review CR-4 (verified: line 127 passes `--label "epic"` straight to `tracker-issue.js --kind create`; the guard regex requires `(priority|severity):${`)
**File**: `skills/ensure-epic-github-issue/SKILL.md:127`

## Description
The contract this diff establishes — 'a label the repo lacks never fails the create, even `bug` itself' (ensure-bug test) — holds for every label that reaches gh, fixed or field-derived. The guard in `tests/gh-labels.test.js` enforces it only for `priority:${…}`/`severity:${…}`, so the one remaining verbatim site (`ensure-epic-github-issue`, fixed label `epic`) is invisible to it.

## Steps to Reproduce
Repository with no `epic` label; run ensure-epic-github-issue B-create → gh rejects the whole create.

## Expected Behavior
Every `--label`/`--add-label` in a fenced block that calls `tracker-issue.js` routes through `gh_labels_filter`; the guard matches any such label, not only field-derived ones.

## Actual Behavior
One site and a narrow guard.

## Impact
Epic creates fail whole on a missing fixed label, silently.

## Recommendation
Route ensure-epic through the helper (`gh_labels_filter "epic"`), widen the guard to any `--(add-)?label "` inside a block that invokes `tracker-issue.js`, and raise the floor to 8.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 2)

**Root Cause**: The guard regex required `(priority|severity):${`, so a fixed label passed straight to `tracker-issue.js` was invisible; `ensure-epic-github-issue` (`--label "epic"`) and `create-issue` (`--label "enhancement" --label "story.180"`) both bypassed the helper.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: Both sites now source the helper and collect `gh_labels_filter "epic"` / `gh_labels_filter "enhancement" "story.180"` into `LABEL_ARGS`. The guard now flags any `--label`/`--add-label` **argument line** in a fenced block that invokes `tracker-issue.js` (the helper's own `LABEL_ARGS+=(--label "$l")` is mid-line and exempt); floor raised to the nine sites that exist.

**Files Modified**:
- `skills/ensure-epic-github-issue/SKILL.md`, `skills/create-issue/SKILL.md`
- `tests/gh-labels.test.js` — guard widened; floor 9
- 9 bundled `references/gh-labels.sh` copies (create-issue and ensure-epic gained one)

**Testing**: Guard green at 9; mutation: a verbatim `--label "epic"` re-added at ensure-epic → red.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 2 (refute pass) |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

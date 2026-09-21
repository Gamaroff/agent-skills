# Bug Report: Task 125 - `gh label list --json name` runs at gh's default `--limit 30`, so a real label past the first page is 'not defined' and stripped

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Diff code review CR-2 (verified: gh's documented default limit is 30)
**File**: `skills/ensure-bug-github-issue/SKILL.md:150`

## Description
The existence check reads `gh label list --json name -q '.[].name'` with no `--limit`. On a repository with more than 30 labels, any label past the first page — including a legitimate `priority:high` — is reported "not defined in this repository — skipped" and dropped from the create.

## Steps to Reproduce
1. Fake `gh` that returns 30 unrelated labels first and `priority:high` 31st (real gh truncates at 30).
2. Run the B5 block with PRIORITY=High.
3. `priority:high` is skipped with the warning.

## Expected Behavior
A label the repository defines is never dropped.

## Actual Behavior
Labels beyond gh's first page are treated as absent.

## Impact
The tolerance intended to keep the create alive silently strips correct metadata on larger repositories; `tests/ensure-bug-label-tolerance.test.js` cannot see it because its fake gh returns ≤4 labels.

## Recommendation
Pass an explicit high limit (`gh label list --json name -L 1000 -q '.[].name'`) and add a test case whose fake gh only emits the wanted label when `-L`/`--limit` is present (or beyond 30 entries).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: `gh label list --json name` was invoked with no `--limit`; gh's documented default is 30 (`gh label list --help`).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: The label read now lives in the shared helper `shared/resources/gh-labels.sh` and passes `-L "$GH_LABELS_LIST_LIMIT"` (default 1000, a named constant a test can mutate).

**Files Modified**:
- `shared/resources/gh-labels.sh` (new) — `gh_labels_filter`
- `tests/gh-labels.test.js` (new) — the fake gh returns NOTHING unless `-L`/`--limit` is present
- `tests/ensure-bug-label-tolerance.test.js` — its fake gh honours the limit the same way

**Testing**: `[bash|zsh] the read carries an explicit limit` green; mutation: `-L` removed → 8 red (every lookup case). ci:fast green.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

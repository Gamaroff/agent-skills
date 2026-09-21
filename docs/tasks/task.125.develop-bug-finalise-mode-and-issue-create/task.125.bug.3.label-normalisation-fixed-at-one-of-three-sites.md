# Bug Report: Task 125 - Enumeration risk: the label normalise-and-filter was applied at ensure-bug B5 only; sync-github-bug's `--kind edit` still passes `severity:${SEVERITY}` verbatim

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: Diff code review CR-3 (verified: `grep -rn -- '--label\|--add-label' skills/*/SKILL.md`)
**File**: `skills/sync-github-bug/SKILL.md:130`

## Description
The root cause — a frontmatter-cased or non-existent label fails the whole gh mutation — has three GitHub call sites that pass a `priority:`/`severity:` label built from frontmatter: `ensure-bug-github-issue` (create, fixed), `sync-github-bug` (`--add-label "priority:${PRIORITY}" --add-label "severity:${SEVERITY}"` on `--kind edit`, lines 130–131, unfixed), and `ensure-story`/`ensure-task`/`sync-github-story`/`sync-github-task` (`priority:${priority}`, lowercased but unchecked). Nothing enumerates the population, so the same defect recurs on the next sync of the same bug.

## Steps to Reproduce
1. Bug with `severity: Major` and an existing issue.
2. Run `sync-github-bug` — `--add-label severity:Major` reaches `gh issue edit` on a repo with no `severity:*` label.
3. The whole edit fails; the body update is lost.

## Expected Behavior
Every site that builds a label from frontmatter normalises and existence-checks it, or a shared helper does so once.

## Actual Behavior
One of the three shapes is fixed.

## Impact
The task's benefit 3 ("A label that does not exist skips the label, never the issue") holds for the create only.

## Recommendation
At minimum apply the same normalise-and-filter loop to sync-github-bug's edit path; better, move the loop into a shared `references/` helper (e.g. `shared/resources/gh-labels.sh`) sourced by every site, and add a guard test that greps the population (`--label`/`--add-label` with `${PRIORITY}`/`${SEVERITY}`/`${priority}`) and asserts each site routes through the helper — with a non-vacuity floor of the sites known today.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: The normalise-and-filter loop was written inline in ensure-bug B5 and nowhere else; six other sites (`sync-github-bug` edit, `ensure-story`/`ensure-task` create, `sync-github-story`/`task`/`epic` edit) passed `priority:${…}` / `severity:${…}` verbatim, and no test enumerated the population.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: One shared helper, `shared/resources/gh-labels.sh` (`gh_labels_filter LABEL...` → surviving labels, one per line), sourced at all seven sites; each site collects the lines into `LABEL_ARGS` and expands `"${LABEL_ARGS[@]}"` into the create/edit. A population guard in `tests/gh-labels.test.js` scans every `skills/*/SKILL.md` fenced bash block: a `--label`/`--add-label` built from `priority:${`/`severity:${` that bypasses the helper is red, with a non-vacuity floor of the seven sites known today; a second test asserts the helper is bundled beside every skill that sources it.

**Files Modified**:
- `shared/resources/gh-labels.sh` (new)
- `skills/ensure-bug-github-issue/SKILL.md`, `skills/sync-github-bug/SKILL.md`, `skills/ensure-story-github-issue/SKILL.md`, `skills/ensure-task-github-issue/SKILL.md`, `skills/sync-github-story/SKILL.md`, `skills/sync-github-task/SKILL.md`, `skills/sync-github-epic/SKILL.md` — route through the helper
- 7 bundled `references/gh-labels.sh` copies
- `tests/gh-labels.test.js` — population guard + bundled-copy check

**Testing**: Guard green at 7 sites; mutation: a verbatim `--add-label "priority:${priority}"` re-added to sync-github-task → guard red. shellcheck `--severity=warning` clean on the helper.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |

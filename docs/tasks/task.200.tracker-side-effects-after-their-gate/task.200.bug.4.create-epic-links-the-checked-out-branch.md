# Bug Report: Task 200 - create-epic still links its PRD on whatever branch is checked out

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1 diff code review, CR-3, verified)
**Date Found**: 2026-10-20

## Description

`skills/create-epic/SKILL.md:160-175` builds the PRD link from
`git rev-parse --abbrev-ref HEAD`, the checked-out branch, with no work-item check:

```text
PRD_URL="https://github.com/${REPO}/blob/${BRANCH}/${PRD_SOURCE_PATH}"
```

This is the obs #287 defect class: a link to a branch that names some other work item. The task's
Success Criterion (§ 2, item 2) says "a card's document link survives the deletion of whatever
branch HEAD happened to be on". This site breaks that criterion and is not migrated. The defect
predates this branch, and its output on `develop` is identical. The task's scope names this defect
class, so it is unfinished work rather than someone else's defect.

`tests/doc-link-branch-population.test.js` cannot see the site, because it is keyed on the `@{u}` /
`@{upstream}` token and this site derives from `HEAD`.

## Expected Behavior

Every document link in shipped prose takes its branch from `doc-link-branch.js`.

## Recommendation

Route create-epic's link through `doc-link-branch.js --doc "$PRD_SOURCE_PATH"`. Widen the population
test to the link construction itself (`blob/${…}` in `skills/*/SKILL.md`), so a site that derives the
branch any other way is caught, with an allowlist for sites that pass the resolver's output. If the
fix is deferred instead, record it under the task's Deferred Work and narrow the criterion's wording
to the nine `@{u}` sites.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 1)

**Root Cause Analysis**: create-epic built its PRD link from `git rev-parse --abbrev-ref HEAD`, so an epic written on another work item's branch linked to a branch that is deleted when it merges. The population test scanned for upstream reads only, so it could not see this.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: Migrated rather than deferred. The PRD link resolves through `doc-link-branch.js --doc "${PRD_SOURCE_PATH}"`. On GitHub the resolver asks `gh`; on Bitbucket the origin HEAD branch is passed as `--default`, falling back to `main`. A `:?` guard follows. The population test gained a link scan: every `blob/${V}` or `src/${V}` link must take V from a resolver call, with two allowlisted builders (finalise's durable-branch rewrite, and jira-sync.js's `buildBitbucketUrl`).

**Files Modified**:

- `skills/create-epic/SKILL.md`
- `tests/doc-link-branch-population.test.js`
- `tests/doc-link-branch-sites-execute.test.js`

**Testing**: The link scan is red against the cycle-1 head's create-epic and names both of its links (lines 174 and 182). The execute test runs both VCS arms: GitHub gives `gh`'s answer and Bitbucket gives `main`. Dropping the `:-main` fallback turns the Bitbucket arm red.

**Verification Steps for QA**:

1. `command node --test tests/doc-link-branch-population.test.js tests/doc-link-branch-sites-execute.test.js`: all pass.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 1 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 1) |

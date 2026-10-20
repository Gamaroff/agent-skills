# Bug Report: Task 200 - A sibling bug's branch is accepted as naming another bug and its parent

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2, refute pass)
**Date Found**: 2026-10-20

## Description

`branchNamesWorkItem` (`shared/resources/doc-link-branch.js:80`) accepts a branch whose last segment starts with the document's id or its parent's id followed by `.`. A bug branch's segment is `{parent}.bug.{N}.{slug}`, so it starts with `{parent}.`, and the match accepts it for every document of that parent. Reproduced:

- `bugfix/task.67.bug.4.x` names `task.67.bug.3.y.md`: true (must differ, a sibling bug)
- `bugfix/task.67.bug.4.x` names `task.67.a.md`: true (must differ, the parent task's own card)
- `bugfix/story.1.8.2.bug.1.x` names `story.1.8.2.bug.2.z.md`: true (must differ)
- `feature/task.67.a` names `task.67.bug.3.y.md`: true (must match, the parent's branch)
- `bugfix/task.67.bug.3.y` names `task.67.bug.3.y.md`: true (must match, its own branch)

The test table carries the two must-match rows and no sibling-bug must-differ row. (Code review CR-3, cycle 2.)

## Steps to Reproduce

`command node -e 'const d=require("./shared/resources/doc-link-branch.js"); console.log(d.branchNamesWorkItem("bugfix/task.67.bug.4.x", "docs/tasks/task.67.a/task.67.a.md"))'` prints `true`.

## Expected Behavior

A `{parent}.bug.{N}` segment names only bug N. It names neither the parent's own document nor a sibling bug.

## Actual Behavior

It names every document of the parent.

## Impact

A card created or synced during another bug's develop-bug run links to that `bugfix/` branch, which is deleted when the bug merges, so the link 404s.

## Recommendation

After matching an id, reject a remainder that starts `.bug.<n>` unless that is the document's own bug. Add sibling-bug and parent-card must-differ rows to the resolver's table.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 2)

**Root Cause Analysis**: `branchNamesWorkItem` matched a branch whose last segment starts with the document's id or its parent's id. A bug branch's segment is `{parent}.bug.{N}.{slug}`, so it matched every document of that parent: the parent's own card and every sibling bug.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: A new `segmentNamesItem` rejects a match whose remainder starts `.bug.<n>` unless that is the document's own bug. Both directions keep their rows: a bug still matches its own branch and its parent's branch (including the hyphenated `task.144-` shape), and the parent and siblings no longer match a bug's branch. `bug.30` does not match `bug.3`.

**Files Modified**:

- `shared/resources/doc-link-branch.js` (and its 17 bundled copies)
- `shared/resources/tests/doc-link-branch.test.mjs`

**Testing**: Six new table rows: four must-differ (sibling task bug, parent task card, sibling story bug, parent story card), one extended-number must-differ (`bug.30` against `bug.3`), and one bare own-branch must-match. Mutation: calling `segmentNames` again turns the resolver test red.

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/doc-link-branch.test.mjs`: 43/43.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 2 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 2) |

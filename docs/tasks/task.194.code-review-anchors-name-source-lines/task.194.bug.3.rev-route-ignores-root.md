# Bug Report: Task 194 - The --rev route reads paths from the repository top level, not --root

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Bug ID**: TASK-194-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR2-1)
**Date Found**: 2026-10-07

## Description

`git show <rev>:<rel>` resolves `<rel>` from the repository top level, so on the `--rev` route a `--root` below the top level is ignored, while the working-tree route honours it.

## Steps to Reproduce

`node shared/resources/finding-anchors.js --findings-file <f> --root shared/resources --rev HEAD --json` with anchors `shared/resources/finding-anchors.js:1` and `finding-anchors.js:1` gives `unchecked-text` and `no-such-file`.

## Expected Behavior

Both routes resolve an anchor relative to `--root`: `finding-anchors.js:1` checks, `shared/resources/finding-anchors.js:1` does not.

## Recommendation

Read `<rev>:./<rel>` with `cwd` at `--root`; add a subdirectory-root test on the `--rev` route.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-07

**Fix Description**: The `--rev` route reads `git cat-file blob <sha>:./<rel>` with cwd at `--root`, so the path is relative to the root on both routes; `cat-file blob` also refuses a tree (CR2-4).

**Files Modified**: `shared/resources/finding-anchors.js` (+ four bundled copies), `shared/resources/tests/finding-anchors.test.mjs`, the four dispatcher `SKILL.md` exit-2 comments, `skills/review-pr/SKILL.md` Step 6, `CHANGELOG.md`, the task document.

**Testing**: New test `both routes resolve an anchor against --root, including a --root below the top level` (both routes; a top-level path under a sub-root is `no-such-file`). Mutation (`./` dropped) turned it red. Directory anchors: `a directory anchor is no-such-file on both routes`; mutation (`cat-file blob` → `show`) turned it red.

**Fix-cycle structural move**: consolidate — `checkTree()` is the one preflight for "could not look" (`--root` and `--rev`), and both read routes resolve a path against `--root`.

## Status History

| Date       | Status       | Changed By | Notes                |
| ---------- | ------------ | ---------- | -------------------- |
| 2026-10-07 | New          | qa-task    | Found in QA cycle 2  |
| 2026-10-07 | Ready for QA | qa-fix     | Fixed in cycle 2 fix |

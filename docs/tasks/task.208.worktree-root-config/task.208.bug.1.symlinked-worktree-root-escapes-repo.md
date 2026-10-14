# Bug Report: Task 208 - A symlinked worktree root puts worktrees outside the repository

**Task**: [Link](./task.208.worktree-root-config.md)
**Bug ID**: TASK-208-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (security probe, path sink)
**Date Found**: 2026-10-14

## Description

`normaliseWorktreeRoot` (`skills/develop-next/scripts/select-next.mjs:53`) decides containment from the
text of the root alone. A root that is, or passes through, a symlink to a directory outside the
repository is accepted, and `git worktree add` then creates the worktree at the symlink's target.

Success criterion 3 says "The selector refuses a root that leaves the repository". This root leaves it.

## Steps to Reproduce

```bash
git init -q repo && cd repo && git commit -q --allow-empty -m init
ln -s /tmp/outside .wt                      # a root that points outside
node -e 'import("<repo>/skills/develop-next/scripts/select-next.mjs").then(m=>console.log(m.normaliseWorktreeRoot(".wt")))'
# → .wt  (accepted)
git worktree add .wt/batch-x -b batch-x
cd .wt/batch-x && pwd -P                    # → /tmp/outside/batch-x
```

The security probe (`task.208.qa.1.security.run.json`, case `path.symlink-escape`) records the same
acceptance.

## Expected Behavior

A root whose real path is outside the repository is refused before any worktree is created.

## Actual Behavior

It is accepted, and worktrees are created outside the repository.

## Impact

Worktrees outside the checkout are what task 208 exists to stop: they are invisible to the repo's
`.gitignore`, survive a fresh clone, and are the `../tc-wt-*` failure mode in a new form. It needs a
deliberate symlink, so it is unlikely by accident.

## Recommendation

The selector is pure and does no filesystem I/O, so the real-path check belongs where the root is
created: `develop-batch` Step 0.3a, before the first `git worktree add` — resolve
`realpath "<worktreeRoot>"` once it exists and refuse it unless it is inside
`git rev-parse --show-toplevel`. The selector's CLI may also check it when the directory exists.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Found by the path-sink probe of normaliseWorktreeRoot; reproduced with git |

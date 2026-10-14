# Bug Report: Task 208 - A symlinked worktree root puts worktrees outside the repository

**Task**: [Link](./task.208.worktree-root-config.md)
**Bug ID**: TASK-208-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-14

**Root Cause**: `normaliseWorktreeRoot` is lexical by design: the selector is otherwise pure, and a
string check cannot see a symlink. Nothing else between the config value and `git worktree add`
looked at the filesystem.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-14

**Fix Description**:

- New exported `worktreeRootEscapes(root, repoDir)` resolves the deepest existing part of the root
  through `realpath`, appends the rest, and refuses a result outside the repository, the repository
  itself, or a dangling link.
- The CLI runs it whenever `--batch` is set, for the default `.worktrees` as well as a flag value,
  and exits 1 with "resolves outside the repository". `develop-batch` passes its root through the
  selector at Step 1, so it is covered without a second check.
- `normaliseWorktreeRoot` now also refuses any control character (QA-208-2).
- `configuration.md`, the develop-batch SKILL and the CHANGELOG entry say so.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs`
- `evals/develop-next/unit/select-next.test.mjs`
- `skills/develop-batch/SKILL.md`, `docs/reference/configuration.md`, `CHANGELOG.md`

**Testing**:

- `13b: worktreeRootEscapes follows symlinks out of the repo, and only out` — link out, missing root
  under a parent link out, dangling link, link to the repo itself: refused. Real directory, root not
  yet created, link to a directory inside, a `..foo` name: accepted.
- `13b: CLI --batch refuses a root that is a symlink out of the repo` — the default root as the link.
- Mutation-proved: removing the CLI check, the control-character refusal, or the dangling-link
  refusal, making the check always false or always true, and loosening the `..` comparison each turn
  a test red.

**Verification Steps for QA**:

1. In a scratch repo, `ln -s /tmp/x .worktrees`, then `select-next.mjs --batch --roadmap <file>`: exit 1.
2. Remove the link: the same command succeeds.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Found by the path-sink probe of normaliseWorktreeRoot; reproduced with git |
| 2026-10-14 | In Progress | qa-fix | Root cause: the only containment check was lexical |
| 2026-10-14 | Ready for QA | qa-fix | Real-path check in the selector CLI; control characters refused |
| 2026-10-14 | Closed | qa-task | Verified by task.208.qa.2.worktree-root-config.md |

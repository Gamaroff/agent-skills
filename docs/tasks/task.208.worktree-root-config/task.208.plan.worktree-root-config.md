# Plan: task.208 Worktrees live inside the repo under a configurable root

## Overview

Every worktree the skills create moves from a sibling of the checkout to
`<repo>/<developBatch.worktreeRoot>/<name>` (default `.worktrees`). The generated worktrees are also
kept out of the searches and copies the skills control. Task:
[`task.208.worktree-root-config.md`](task.208.worktree-root-config.md).

## Phase-by-Phase Implementation Guide

### Phase 1: Selector

`skills/develop-next/scripts/select-next.mjs`:
- `DEFAULT_WORKTREE_ROOT = ".worktrees"`, `BATCH_WORKTREE_PREFIX = "batch-"`, `normaliseWorktreeRoot(root)`
  (null for absolute, drive-letter, `..`, empty or `.`)
- `worktreeFor(row, root)` builds `${root}/batch-${slug}`. `selectBatch(model, { worktreeRoot })`
- CLI `--worktree-root <dir>`. A refused root writes to stderr and exits 1, with no `process.exit()`
  (bug.3)

### Phase 2: develop-batch

`skills/develop-batch/SKILL.md`: config table row, a paragraph on the key, state example
`dir`, Step 0.3a (`git check-ignore -q "<worktreeRoot>/"` or append to
`$(git rev-parse --git-common-dir)/info/exclude`, then report), Step 0.4 stale glob
`<worktreeRoot>/batch-*`, Step 1 `--worktree-root <worktreeRoot>`.

### Phase 3: create-parallel-stories and runbooks

Replace `../worktrees/` with `.worktrees/`. Add the gitignore-first note and the in-repo directory
diagram. Return with `cd ../..`. Update the two runbooks the same way.

### Phase 4: Discovery

`/.worktrees/` in `.gitignore`. In `qa-execute-snippets.mjs`, a `cpSync` filter skips nested
linked worktrees on both `--copy` and `--copy-as`. Prose: `--exclude-dir` and `-prune`. Then
`npm run bundle`.

### Phase 5: Docs and close-out

Add the schema line and key row to `docs/reference/configuration.md`, and a CHANGELOG
`[Unreleased]` entry.

## Key Patterns and References

- `--require-touches` is the precedent for passing a `developBatch.*` key to the config-free selector
  as a flag.
- `split/join` patching with a match count (memory: never `String.replace` with a replacement string).

## Testing Approach

See the task's Testing Strategy. Every new test was mutation-proved: revert the behaviour, watch it
go red, then restore.

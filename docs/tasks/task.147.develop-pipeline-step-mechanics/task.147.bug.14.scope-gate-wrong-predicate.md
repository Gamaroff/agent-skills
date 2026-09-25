# Bug Report: Task 147 - The verify-push-state scope gate accepts spellings that check 3 cannot match

**Task**: [Link](./task.147.develop-pipeline-step-mechanics.md)
**Bug ID**: TASK-147-BUG-14
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 5, CR-3 with its members CR-1, CR-2 and CR-4)
**Date Found**: 2026-09-25

## Description

The `--scope` gate accepts a scope that exists under filesystem semantics (`-e`, which follows case folding and symlinks) or under pathspec semantics (`git ls-files -- "$s"`, which expands globs and `:/` magic). Check 3 then matches porcelain paths by literal string prefix. A spelling that passes the gate but that check 3 cannot match is a vacuous pass. Cycles 2 to 4 each closed one such spelling; this report is about the gate itself.

## Steps to Reproduce

In a pushed branch whose `docs/tasks/task.1/r.md` is dirty, run `verify-push-state.sh --base main --scope` with each of these scopes. Each exits 0, as a vacuous pass:

- `'docs/tasks/task.1*'` (a glob)
- `DOCS/tasks/task.1` (case-folded, on macOS)
- `:/docs/tasks/task.1` (pathspec magic)

## Expected Behavior

Exit 1 (the dirt is inside the scope), or exit 2 (a scope that names no path git reports).

## Recommendation

Accept a scope only when check 3's own `in_scope` predicate matches at least one path from `git ls-files -z --cached --others --exclude-standard`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-25

**Fix Description**: The mechanism is replaced, not patched. One `path_under` predicate now serves both the scope gate and check 3. A scope is accepted only when that predicate matches at least one path git reports: the index, untracked files that are not ignored, and HEAD's tree, which keeps a scope whose files were all renamed away. The listing is case-exact, does no globbing and follows no symlinks. An unreadable listing defers to check 3, which fails on the same unreadable index. The ./, // and absolute normalisation stays as a convenience. `--help` now prints by markers, so it survives the header the bundler adds (CR-6), and the refusal message now names the unresolvable case (CR-5).

**Testing**: cases 28–32 cover the glob, `:/`, case-folded, symlink-component and bundled-help inputs. All 32 cases pass under bash 5 and 3.2. Four mutations each turned their named case red: the old -e/ls-files predicate, dropping HEAD's tree, the fixed help range, and exiting 2 on an unreadable listing.

## Status History

| Date       | Status       | Changed By | Notes                                              |
| ---------- | ------------ | ---------- | -------------------------------------------------- |
| 2026-09-25 | New          | qa-task    | QA cycle 5                                         |
| 2026-09-25 | Ready for QA | qa-fix     | Mechanism replaced; mutation-proved               |
| 2026-09-25 | Closed       | qa-task    | QA cycle 6: 38 by-hand probes, 0 vacuous passes; cases 28–32 mutation-proven |

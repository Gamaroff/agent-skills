# Bug Report: Task 172 - The config mode check is anchored to the working directory, the read to the repository root

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-23
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 5 scoped review; reproduced by QA)
**Date Found**: 2026-10-01

## Description

The cycle 4 mode check runs `git ls-tree <sha> -- skills-config.yaml`, which is relative to the working directory, while the unchanged read `git show <sha>:skills-config.yaml` is relative to the repository root. With `--workspace-root <subdir>` the ls-tree finds nothing, so the defaults apply and a root configuration holding `enabled: false` is not seen (reproduced through `readConfigAtCommit`: root gives `false`, a subdirectory gives `true`; before cycle 4 the read used the root). The reverse case (the file only in the subdirectory) is refused. Latent: no skill passes `--workspace-root` today, but the option is in the usage text.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; a configuration the engine cannot fully read is refused, not replaced by the defaults.

## Actual Behavior

See the description.

## Impact

An owner's opt-out is silently ignored, or a legitimate configuration is refused.

## Recommendation

Anchor both reads to the same place: run them with the repository top-level as the working directory, or use `--full-name` with a `:/` pathspec for ls-tree and `:./` for show. Test `--workspace-root` on a subdirectory with the config at the root.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 5)

Reproduced by QA before the fix, and confirmed again by running the exported readers.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: the mode check runs `git ls-tree --full-tree <sha> -- skills-config.yaml`, so its path is relative to the repository root like the unchanged `git show <sha>:skills-config.yaml` that follows it, whatever the working directory.

Tests: a real repository with the opt-out at the root and the code in a subdirectory, run with `--workspace-root` on the subdirectory (`disabled`), and `readConfigAtCommit` called with the subdirectory as its root. Mutation proof: dropping `--full-tree` turns the CR5-3 test red.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 5                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

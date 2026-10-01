# Bug Report: Task 172 - A submodule pointer under a docs pattern is classified as docs

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-8
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; reproduced by QA)
**Date Found**: 2026-10-01

## Description

A gitlink path under a docs pattern (docs/vendor) is docs by pattern but a pointer bump is code. Reproduced with a 160000 entry: tree-equivalent. diff.ignoreSubmodules=all would also hide it as an empty delta.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Pass --ignore-submodules=none, and treat any path with mode 160000 as code.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause: the delta was read with `--name-only`, which gives no mode, and submodule changes are subject to `diff.ignoreSubmodules`.

Fix: the delta is read with `--raw -z --no-renames --ignore-submodules=none`; any entry with mode 160000 is returned as `:gitlink:<path>`, which no pattern matches, so it is `code-changed`. Tests: a pointer under `docs/` with and without `diff.ignoreSubmodules=all`. Mutation proofs G5a, G5b.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

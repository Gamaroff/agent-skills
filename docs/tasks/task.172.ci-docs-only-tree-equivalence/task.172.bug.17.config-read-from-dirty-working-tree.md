# Bug Report: Task 172 - The configuration is read from the working-tree file, not the commit judged

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-17
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; reproduced by QA)
**Date Found**: 2026-10-01

## Description

An uncommitted edit that widens ci.docsOnly.patterns to ** makes a committed src/b.js change read as docs (reproduced). CR2-3 pins the commit to HEAD but not the dirty tree.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

Read skills-config.yaml from the judged commit with git show; the file in the working tree is not consulted.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix (the same consolidated configuration schema, one reader): the configuration is read from the commit judged with `git show <head>:skills-config.yaml`, never from the working tree. A commit without the file means "not configured".

Tests: an uncommitted widening edit does not decide a committed delta; a config that exists only on disk is "not configured". Mutation proof H6.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

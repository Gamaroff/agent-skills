# Bug Report: Task 172 - Unknown or misspelled keys under ci.docsOnly are silently ignored

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-7
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; reproduced by QA)
**Date Found**: 2026-10-01

## Description

The readConfig docstring forbids silent fallback, but a misspelled key is one. Reproduced: `checkcommand: "false"` gives exit 0 with checkExit null, dropping the safety net this repository relies on.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

Reject any key under ci.docsOnly that is not a known one with a usage error naming it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause: `readConfig` validated the keys it knew and ignored the rest.

Fix: any key under `ci.docsOnly` outside `enabled`, `patterns`, `checkCommand`, `checkTimeoutSeconds` is a usage error naming it, and so is a `ci.docsonly` (wrong case). Tests: three misspellings, each exit 2 naming the key. Mutation proofs G4a, G4b.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

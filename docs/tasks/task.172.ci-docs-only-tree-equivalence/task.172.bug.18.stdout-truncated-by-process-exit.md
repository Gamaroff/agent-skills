# Bug Report: Task 172 - A large --json payload is truncated when the process exits with output unflushed

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-18
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; reproduced by QA)
**Date Found**: 2026-10-01

## Description

process.exit runs right after a stdout.write to a pipe, so a 4000-file docs delta produced 131072 bytes instead of the full document (reproduced), jq fails and the rule silently never fires.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

Set process.exitCode instead of calling process.exit, and cap the changed array in the JSON record.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: the CLI sets `process.exitCode` and lets the process drain instead of calling `process.exit`; the `--json` record keeps the full `changedCount` but lists at most 200 paths.

Tests: a 4000-file docs delta through a pipe yields a parseable record with `changedCount` 4000 and 200 listed; a pin forbids `process.exit(code)`. Mutation proofs H7a, H7b.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

# Bug Report: Task 172 - A YAML block scalar checkCommand is read as the literal ">-" and passes vacuously

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-13
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; reproduced by QA; severity re-rated (reviewer: high))
**Date Found**: 2026-10-01

## Description

The YAML subset reads `checkCommand: >-` (folded scalar) as the string ">-" and drops the indented rows; `sh -c ">-"` is a bare redirection that exits 0, so the configured check is skipped and a stray file named "-" is created. Reproduced. Reviewer rated high; QA rates medium (needs an owner config in a shape the docs do not show; same class as CR2-4).

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

Refuse a checkCommand that starts with a YAML block-scalar indicator (> or |) as a usage error that says to write it on one line.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause (the configuration subsystem, cycles 1 to 3): the YAML subset reads a folded scalar as the literal `>-`.

Fix (Step 2.6 move: consolidate): `parseConfig` is now the one schema for the configuration. A `checkCommand` that is only a block-scalar indicator is a usage error that says to write the command on one line.

Tests: five indicator forms exit 2 and create no stray file; a one-line command containing `>` still runs. Mutation proof H2.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

# Bug Report: Task 172 - A ci block that is not a mapping, or a near-miss key spelling, silently runs the rule with defaults

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-14
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; reproduced by QA; severity re-rated (reviewer: high))
**Date Found**: 2026-10-01

## Description

`ci: { docsOnly: { enabled: false } }`, `ci: false`, `ci.docs-only` and `ci.docs_only` are all ignored and the rule runs ON with `**/*.md`; an owner who opted out is overridden. Reproduced for four shapes. Reviewer rated high; QA rates medium (same class as CR2-4).

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

A ci value that is not a mapping is a usage error; a key under ci or at top level that normalises to docsonly or ci (case, - and _ ignored) but is not exactly docsOnly or ci is a usage error.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix (same consolidated schema): `ci` must be a block mapping; a near-miss spelling of `ci` or `docsOnly` (`docs-only`, `docs_only`, `docsonly`, `CI`) is a usage error; `ci.docsOnly` must be a block mapping. An empty `ci:` is "not configured".

Tests: seven malformed shapes exit 2 naming the problem; an empty block is accepted. Mutation proofs H3a to H3c.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

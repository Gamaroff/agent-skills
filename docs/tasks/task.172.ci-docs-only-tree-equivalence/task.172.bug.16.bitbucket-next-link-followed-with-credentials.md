# Bug Report: Task 172 - The Bitbucket pagination follows a next link to any host with the Authorization header

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-16
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe; reproduced by QA)
**Date Found**: 2026-10-01

## Description

A `next` URL of https://evil.example/steal was fetched with the bearer token attached (reproduced with an injected fetch), and the walk went on to exit 0.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed or is refused.

## Actual Behavior

See the description.

## Impact

An unverified head can be recorded as CI-verified, or a safety net or the JSON record is silently dropped.

## Recommendation

Follow a next link only when it begins with the Bitbucket API base; otherwise the read is UNKNOWN.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 3)

Reproduced by QA (or confirmed in the source) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Fix: a `next` link is followed only when it begins with the Bitbucket API base; otherwise the read is UNKNOWN and the Authorization header never leaves it.

Tests: a next link to another host sends no request there and the answer is `unverifiable`; a next link on the API is followed. Mutation proof H5.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 3                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

# Bug Report: Task 172 - An ancestor with one success and skipped jobs reads green (paths-filter shape)

**Task**: [Link](./task.172.ci-docs-only-tree-equivalence.md)
**Bug ID**: TASK-172-BUG-5
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass; reproduced by QA (reviewer confidence medium))
**Date Found**: 2026-10-01

## Description

Cycle 1 fixed only the all-skipped case. An ancestor with a success check (a paths-filter "changes" job) plus skipped test jobs reduces to SUCCESS. Reproduced: [success, skipped] gives exit 0 tree-equivalent. A docs-only ancestor sitting on unverified code launders the head.

## Expected Behavior

Exit 0 means `tree-equivalent` and nothing else; every input the rule cannot vouch for fails closed.

## Actual Behavior

See the description: the reproduction exits 0 (or silently degrades) where it must not.

## Impact

A not-verified head can be recorded as CI-verified, or a safety net is silently dropped.

## Recommendation

An ancestor with any skipped or neutral check is not green evidence on its own; the walk continues to an older ancestor whose checks all succeeded. State the rule in configuration.md.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New to In Progress)

**Date**: 2026-10-01
**Developer**: develop-task pipeline (qa-fix cycle 2)

Reproduced by QA (or confirmed in the source, per the finding) before the fix.

#### Fix Implementation (In Progress to Ready for QA)

**Date**: 2026-10-01

Root cause (Step 2.6, repeat subject of cycle 1's CR-2): guessing which skipped checks are vacuous. Move: scope the claim.

Fix: for an ancestor, green means every check ran and succeeded. Any skipped or neutral check makes it `NONE`, so the walk continues to an older fully green commit. The head reduction in `/finalise` Step 6 is unchanged. Documented in `configuration.md` and the finalise arm text.

Tests: the `reduceChecks` table, the CLI case, and a walk that skips a mixed ancestor to reach a fully green one. Mutation proof G2.

## Status History

| Date       | Status       | Changed By | Notes                               |
| ---------- | ------------ | ---------- | ----------------------------------- |
| 2026-10-01 | New          | QA         | Found in QA cycle 2                 |
| 2026-10-01 | In Progress  | qa-fix     | Investigation started               |
| 2026-10-01 | Ready for QA | qa-fix     | Fix implemented and mutation-proven |

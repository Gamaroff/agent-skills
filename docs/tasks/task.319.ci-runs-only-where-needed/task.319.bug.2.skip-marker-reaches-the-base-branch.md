# Bug Report: Task 319 - The skip marker can reach the base branch head

**Task**: [Link](./task.319.ci-runs-only-where-needed.md)
**Bug ID**: TASK-319-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-24

## Description

`push-policy.sh --mark` marks the last commit of the PR at `finalise-accept` and `step8` (T319-CR-101).

## Steps to Reproduce

Set `ci.skipMarker: "[skip ci]"`, run a pipeline to Step 8, merge the PR with a rebase (or a fast-forward on Bitbucket).

## Expected Behavior

The base branch's CI runs for the merged code.

## Actual Behavior

The marked record commit is the base branch head, so the forge skips the run for the whole push. A squash merge whose body lists the commit messages carries the marker too.

## Impact

Code lands on the base branch without its run.

## Recommendation

Mark nothing unless the merge strategy is stated to be a merge commit, and state the constraint in the configuration reference.

## Developer Fix Cycle 1

**Date**: 2026-11-24

**Root cause**: `--mark` judged the head alone, and never asked how that head reaches the base branch.

**Fix**: `push-policy.sh --mark` answers `unmarked` unless `developNext.mergeStrategy` is written in the configuration at `HEAD` and is exactly `merge`. It also answers `unmarked` when `ci.docsOnly.checkCommand` is set. `docs/reference/configuration.md` states both, and the merge a person can make that carries the marker all the same.

**Tests**: `shared/resources/tests/push-policy.test.mjs` (unset, squash, rebase, another spelling, a flow mapping and a duplicate key are each `unmarked`); red when the check is removed or loosened to "not squash".

**Verify**: with `ci.skipMarker` set and `mergeStrategy: squash`, `--mark --site step8` on a record-only head prints `unmarked` and the subject is unchanged.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-24 | Ready for QA | qa-fix | Fixed in QA cycle 1 |

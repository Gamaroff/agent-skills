# Bug Report: Task 174 - The guide overstates what the concurrency fix guarantees

**Task**: [Link](./task.174.ci-docs-only-classifier-template.md)
**Bug ID**: TASK-174-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 2 refute pass; code review CR-2, verified against the code)
**Date Found**: 2026-11-02

## Description

The guide's `cancel-in-progress` section (`docs/runbooks/ci-docs-only-skip.md`, rewritten in QA
cycle 1) says: "So a base-branch run must always finish". It then presents PR-only cancellation as
what keeps it so.

The push path skips without evidence. `classify-changes.sh:225` (`all_docs "$CHANGED" && emit false`)
emits `false` for any docs-only `before..after` push, whatever happened to `before`'s run. So
concurrency closes only one way the code merge's run can fail to give a verdict. These remain:

- cancelled by hand;
- hit `timeout-minutes`;
- runner lost;
- red;
- still running when the docs merge lands.

In each case, the base head after the docs merge shows green, and the merged code never passed a
full run there.

## Steps to Reproduce

1. Merge a code PR into `develop`. Its push run fails, or is cancelled by hand.
2. Merge a docs-only PR. Its push run classifies `code=false` and its `ci-ok` is green.

## Expected Behavior

The guide states what the push path does and does not check, and lists the cases concurrency does
not cover.

## Actual Behavior

The guide reads as if the concurrency change closes the gap.

## Impact

An adopter reads the guide's guarantee as complete and does not watch for a red or unfinished
base-branch run behind a green docs merge.

## Recommendation

Scope the claim in the guide. The push path's no-evidence skip is the lifted tinker-city behaviour,
and the guide already accepts the merge-result trade-off on the same grounds. Add a push-path
evidence lookup only if the task owner wants the template to diverge from its source.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-02

**Root Cause**: The cycle-1 rewrite generalised from the one case it fixed (concurrency cancelling
a base run) to a guarantee about every base run.

**Fix** (structural move: scope the claim): the guide's `cancel-in-progress` section now says three
things:

- PR-only cancellation removes one case, and nothing in the template makes a code merge's base run
  always reach a verdict.
- These cases remain: red; cancelled by hand, timed out or runner lost; still running.
- Adopters should read the base branch by commit. If they need the head to prove the code under it,
  they should run the heavy jobs on every `push`, or keep a merge queue.

The push path's no-evidence skip is unchanged: it is the lifted behaviour.

**Verification**: read against `classify-changes.sh:186-225` (the push branch, and the `all_docs …
&& emit false` line). `doc-links.js` passes on the guide.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | New | qa-task | Filed in QA cycle 2 |
| 2026-11-02 | Ready for QA | qa-fix | Fixed in QA cycle 2 fix pass |
| 2026-11-02 | Closed | qa-task | Verified by task.174.qa.3.ci-docs-only-classifier-template.md |

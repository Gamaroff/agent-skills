# Bug Report: Task 170 - Hostile gate `head:` values are not in the committed suite

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1 boundary probe)
**Date Found**: 2026-10-03

## Description

`reenter-qa-after-finalise.sh` is a boundary by its own header (it refuses, fails closed) and reads a
value it does not write — the gate's `head:` — into `git rev-list` / `git cat-file` /
`git merge-base`. The security probe engine cannot judge it: the `shell:` form's `filename` corpus
expects `qa-cycle.sh`'s stdout contract (28 executed, verdict `absent` — every case a contract
mismatch), and the `path` sink is `entry-not-probeable` for a shell entry. QA executed eight hostile
heads by hand (`$(touch PWNED)`, backticks, `--all`, `-n`, `HEAD~0`, a 40-hex non-commit,
`x; touch PWNED3`, a quoted substitution): none executed anything, and each was treated as moved —
the documented safe direction. None of these is in the committed suite, so a later edit to the
head-validation predicate can regress without a test going red.

## Expected Behavior

The suite pins the hostile-head behaviour: no command substitution executes, an option-shaped or
symbolic head is never passed to git as a revision, and the re-entry fails toward re-review.

## Actual Behavior

Only `HEAD` (symbolic) and a non-ancestor commit are covered.

## Impact

The one input the script trusts least is the one its tests probe least.

## Recommendation

Add a table-driven case group to `reenter-qa-after-finalise.test.sh` for the eight heads above,
asserting no `PWNED*` file exists and the lock reaches step 5.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-03

**Root Cause**: the hostile values were executed by hand at QA and never committed.

**Fix Description**: a table-driven `hostile_head` group in the suite writes each of the eight heads verbatim into the gate, asserts no `PWNED*` file anywhere under the temp root, and that the lock reaches step 5 (counted as moved).

**Files Modified**:
- `shared/resources/reenter-qa-after-finalise.test.sh` — 8 cases.

**Testing**: 8/8; disabling the head validation and the `|| echo 1` fallback turns 10 cases red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 1            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 1        |
| 2026-10-03 | Closed       | QA         | Verified in QA cycle 2         |

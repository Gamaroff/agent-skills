# Bug Report: Task 145 - "branch that fires" element assertion is vacuous at three sites

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-1)
**Date Found**: 2026-09-25

## Description

`tests/outcome-reachability-check.test.js` asserts the "branch that fires" element with `/\bbranch/`.
The review-task, review-story and create-task check items all also say "walk that input through its
decision branches", and that phrase satisfies the regex on its own. So the element assertion passes
whether or not the check names the branch that fires.

## Steps to Reproduce

1. `cp skills/review-task/SKILL.md /tmp/snap`
2. Replace every `branch that fires` in the file with `result`
3. `command node --test tests/outcome-reachability-check.test.js` → `fail 0`
4. Restore from `/tmp/snap`. The result is the same for review-story and create-task.

## Expected Behavior

The per-site test goes red naming "the obs #168 check does not name the branch that fires".

## Actual Behavior

The test stays green at 3 of 4 sites. Only review-bug's item, which has no other "branch" word, goes
red. The implementation notes' "8/8 mutants red" is true, but element removal was proven on
review-bug only.

## Impact

Success criterion 3 ("fails when any one of the three elements is removed from a site's check item")
does not hold for 3 of 4 sites. A later edit that drops the branch wording would pass CI.

## Recommendation

Match `/branch that fires/`, which all four items carry. Re-run the element mutation at every site and
record the 4x3 matrix.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

**Root Cause**: The element pattern was a word the element contains (`/\bbranch/`) rather than the element's phrase. Every item also says "decision branches", which satisfies the word.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

**Fix Description**: The branch element now matches `/branch that fires/`, which all four items carry. A comment on `ELEMENTS` records why each pattern is the element's own phrase.

**Files Modified**:

- `tests/outcome-reachability-check.test.js`

**Testing**:

- The CR-1 mutation (replace only "branch that fires" at each site, keeping "decision branches") is now **red at 4/4 sites**, each naming the element.
- Control: the old regex plus the same mutation is green, which reproduces the defect and proves the regex change is the fix.
- The 4x3 element matrix (all three elements removed in turn at all four sites) is red for all 12 cells.

**Verification Steps for QA**: run the mutation in the Steps to Reproduce section. Expect `fail 1` naming "does not name the branch that fires".

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 1 (CR-1) |
| 2026-09-25 | Ready for QA | qa-fix | Element regex tightened; 12/12 element mutants red |
| 2026-09-25 | Closed | QA Engineer | verified FIXED at QA cycle 2; holds at QA cycle 6 (suite 4002/4003 pass, 0 fail) |

# Bug Report: Task 239 - Third-strike files miss a file a loop-limit grant's first 5b will strike

**Task**: [Link](./task.239.qa-escalation-and-grant-say-what-runs.md)
**Bug ID**: TASK-239-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-28

## Description

The new "Filling the escalation entry" rule 1 in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
tells the escalation to run the third-strike comparison over the last three gates, "exactly as 5b
would on re-entry". That is true only for a not-converging grant, which re-enters at 5b on the
latest gate.

A loop-limit grant re-enters at 5a. The resumed run writes gate `base+1` first, and its 5b then
compares gates `base-1`, `base` and `base+1`. The escalation compared `base-2`, `base-1` and `base`.
A file that HIGH findings struck at `base-1` and `base` (two strikes) is not in the escalation's
"Third-strike files". If gate `base+1` raises it again, the resumed 5b forbids a patch to it, and
the escalation may already have recommended one. That is the obs #71 defect this task closes, on
the loop-limit path.

## Steps to Reproduce

1. A run halts at the loop limit after gates 4 and 5 both raise a HIGH in `x.sh`; gate 3 did not.
2. The escalation runs the comparison over gates 3, 4 and 5: `x.sh` is not printed, so it is not a
   third-strike file, and step 1 may recommend patching it.
3. The operator grants 2 cycles. The run re-enters at 5a, gate 6 raises `x.sh` again, and 5b's
   comparison over gates 4, 5 and 6 strikes it: the patch the escalation recommended is refused.

## Expected Behavior

The escalation's constraint matches the comparison the resumed run's first 5b will make, for both
halt kinds.

## Actual Behavior

For a loop-limit halt the escalation constrains only files already struck three times, and says it
matches 5b.

## Impact

An operator following the recommendation on a loop-limit grant can spend the first granted cycle on
a patch the pipeline then refuses.

## Recommendation

On a loop-limit escalation, also list the files HIGH findings struck in the last two gates (the
comparison's two-gate form), mark them "one strike from the third-strike rule", and do not recommend
a patch to them. Keep the three-gate comparison for a not-converging escalation. Drop the "exactly
as 5b would" wording or make it true per halt kind. Add a template-test assertion for the two-gate
case.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: Filling rule 1 named one comparison for both halt kinds. `grant-qa-cycles.sh`
re-enters a not-converging grant at 5b and every other grant at 5a (its `reenter_at=`), so after a
loop limit the resumed 5b's three gates are N-1, N and the gate the resumed review writes. Gates
N-2..N are not compared.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-28

**Fix Description**:

- Filling rule 1 now has a table, one row per halt. It gives the re-entry phase, the gates the
  resumed 5b compares, the command to run now, and how to list each file. A convergence stall runs
  the existing three-gate block and lists files as struck. A loop limit runs
  `comm -12 <(high_files "$GATE_N1") <(high_files "$GATE_N")` and lists files as one strike from the
  third-strike rule. A patch is never recommended for either.
- Both templates' **Third-strike files** line and step 1 point at filling rule 1 instead of
  restating "the last three gates" and "the resumed 5b".

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: filling rule 1 and both templates
- `evals/shared/tests/qa-escalation-template.test.mjs`: a behavioural test runs the doc's own
  `high_files()` on fixture gates where a file is HIGH at N-1 and N only. The three-gate block prints
  nothing and the loop-limit command prints the file.
- `CHANGELOG.md`: the `[Unreleased]` entry now names the comparison per halt kind

**Testing**: the new test passes. Mutating the loop-limit row back to the three-gate command turns
it red; reverted green.

**Verification Steps for QA**:

1. Read filling rule 1's table against `grant-qa-cycles.sh`'s `REENTER` case.
2. `command node --test evals/shared/tests/qa-escalation-template.test.mjs`

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | New | QA Engineer | QA cycle 1 — code-review finding CR-1, confirmed by reading the 5a/5b re-entry order in the resume contract step 4 |
| 2026-10-28 | In Progress | qa-fix | Investigation, QA cycle 1 |
| 2026-10-28 | Ready for QA | qa-fix | Per-halt comparison table in filling rule 1; behavioural test added |

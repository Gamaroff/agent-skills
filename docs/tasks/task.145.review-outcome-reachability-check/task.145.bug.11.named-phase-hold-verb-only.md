# Bug Report: Task 145 - The loosened NAMED_PHASE hold no longer checks the naming sentence

**Task**: [task.145.review-outcome-reachability-check.md](./task.145.review-outcome-reachability-check.md)
**Bug ID**: TASK-145-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer (QA cycle 6, CR6-1)
**Date Found**: 2026-09-25

## Description

The cycle-5 fix for CR5-3 loosened `NAMED_PHASE` in `tests/outcome-reachability-check.test.js:66` so
that each site could word its own naming sentence. The middle of the pattern is now
`Name that \1 [^.]*\.`, so the hold checks only the verb `Name that phase|task`. Whatever follows it
passes. That includes the CR5-3 defect with only its verb changed.

## Steps to Reproduce

Snapshot each file, apply one edit, run `command node --test tests/outcome-reachability-check.test.js`,
then restore from the snapshot:

1. In `skills/create-task/SKILL.md`, change `Name that phase in the criterion.` to
   `Name that phase in the finding.` The suite stays green (rc 0).
2. In `skills/review-task/SKILL.md`, change `Name that phase when you pass the criterion.` to
   `Name that phase only if the author asks.` The suite stays green (rc 0).

## Expected Behavior

Each site's naming sentence is held. A reworded or hedged sentence, or a return of the create-task
wording that CR5-3 removed, turns the test red.

## Actual Behavior

Only the literal old `Cite that phase in the finding.` goes red, because it does not start with
`Name that`. The test comment says the sentence is "worded per site", but no test checks the wording
at any site. review-task and review-story can drift apart without a red test.

## Impact

The test no longer guards what the cycle-5 fix changed. The requirement and exclusion halves are
still held in full: dropping review-story's exclusion sentence turns the test red (cycle-6 mutation M4).

## Recommendation

Turn `NAMED_PHASE` into a per-site factory, like `patternLine(check)`, that takes each site's own
naming sentence. Keep the requirement and exclusion shared and held in full. Mutation-prove it with
both edits above.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-25 | New | QA Engineer | QA cycle 6 (code review CR-1, confirmed by mutations M3 and M5) |

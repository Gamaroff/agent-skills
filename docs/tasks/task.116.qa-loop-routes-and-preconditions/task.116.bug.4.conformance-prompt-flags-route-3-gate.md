# Bug Report: Task 116 - The PR conformance prompt flags every route-3 gate as a TRAIL defect

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-4
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute reviewer, CR-2; verified by QA)
**Date Found**: 2026-09-13

## Description

Route 3 hands a `CONCERNS` gate with no open entry to `/review-pr`. `shared/resources/pr-conformance-prompt.md:62–63` lists "the highest-numbered gate is not PASS or WAIVED" and "that gate's top_issues[] is non-empty" as TRAIL defects. So every route-3 gate arrives at 5c pre-flagged by construction.

## Expected Behavior

The conformance lens accepts the accepting-route set: a `CONCERNS` gate whose `top_issues[]` has no open entry is a clean trail; "non-empty" means open entries.

## Actual Behavior

A medium rating on the TRAIL finding yields a spurious `CONCERNS` verdict; a high rating yields `REQUEST CHANGES` → 5b, where `/qa-fix` cannot change code for a gate token and the no-code-change HALT fires — the exact HALT route 3 exists to remove.

## Impact

HIGH: route 3 is defeated one step downstream of where it was added.

## Recommendation

Amend the two TRAIL bullets to accept `CONCERNS` with no open entry and to read "non-empty" as "has an open entry"; regenerate the `review-pr` bundled copy; pin it in the parity test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-13 · **Developer**: Claude (qa-fix, cycle 2)

**Root Cause Analysis**: the TRAIL bullets in `pr-conformance-prompt.md` encoded the pre-route-3 exit condition as a defect signature.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: the two bullets now read "the highest-numbered gate **did not reach 5c** — it is `FAIL`, or it carries an OPEN entry no active waiver covers; a CONCERNS gate whose entries are all closed or whose list is empty is a reservation and a clean trail (route 3) — do NOT flag it for its token" and "that gate's top_issues[] has an open entry — 'non-empty' means open, not merely present". `review-pr` bundled copy regenerated.

**Testing**: "stated once" test asserts the prompt carries no "is not PASS or WAIVED" and does carry "did not reach 5c" and the non-empty-means-open sentence; mutation-proved.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-13 | New          | QA         | Cycle 2 refute reviewer (CR-2) |
| 2026-09-13 | Ready for QA | qa-fix     | TRAIL bullets keyed on reaching 5c |

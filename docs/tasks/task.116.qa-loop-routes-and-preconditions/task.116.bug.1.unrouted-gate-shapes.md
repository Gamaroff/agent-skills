# Bug Report: Task 116 - Outcome branching leaves two gate shapes unrouted

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 3b diff reviewer, CR-1)
**Date Found**: 2026-09-13

## Description

The rewritten **Outcome branching** in `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (≈:252–262) replaced the old catch-all arm (`CONCERNS`, `FAIL`, or has `top_issues` → …) with four arms: `PASS` with no `top_issues`; `WAIVED` with an active waiver; `CONCERNS` with no open entry; `FAIL` or `CONCERNS` with an open entry. Two legal gate shapes now match **no** arm:

1. `PASS` carrying open **LOW** entries — legal under gate rule 5 (only HIGH/MEDIUM change the verdict).
2. `WAIVED` whose `waiver.active` is `false` or undocumented.

Both previously fell into the catch-all and reached the Convergence check; now the router has no instruction for them.

## Steps to Reproduce

Read the four arms against a gate `gate: PASS` with `top_issues: [{severity: low, status: open}]`. No arm's condition is satisfied.

## Expected Behavior

Every `gate` × `top_issues[]` combination has exactly one route.

## Actual Behavior

Two combinations have none.

## Impact

An orchestrator executing the prose reaches an unrouted gate and improvises — the exact class of defect task.116 exists to remove.

## Recommendation

Add an explicit arm: any other gate with an open `top_issues[]` entry (a `PASS` with open LOW entries, a `WAIVED` without an active waiver) runs the Convergence check / Diminishing-returns exit as the `FAIL` arm does — or, if a `PASS` with only LOW open entries is meant to hand to 5c, say so. Extend the route-3 test in `evals/shared/tests/pr-review-loop-parity.test.mjs` to pin the closed set of shapes.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-13
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause Analysis**: the route-3 rewrite replaced a catch-all arm with four positive arms and never restated the catch-all, so the two shapes the old arm absorbed by accident — `PASS` + open LOW entries, `WAIVED` + inactive waiver — fell out of the set.

**Proposed Fix**: restore a catch-all keyed on the queue ("any other gate with an open entry"), route it like `FAIL`, and add a malformed clause so "matches nothing" becomes a HALT rather than a guess.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-13

**Fix Description**:
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` Outcome branching: added arm 5 (**Any other gate with an open entry in `top_issues[]`** → same road as `FAIL`) naming both shapes, and a malformed clause (unparseable `gate:` / `top_issues[]` → **HALT**), stated as exhaustive over `{PASS, WAIVED, CONCERNS, FAIL} × {no open, open}`.
- `evals/shared/tests/pr-review-loop-parity.test.mjs`: new test "the outcome-branching arms are exhaustive" pins all six arms; `branchingArm()` now trims continuation lines.
- Adversarial pass over the fix (Step 3.5) found the malformed clause's own example (`PASS` + open HIGH) was actually caught by arm 5; example corrected to a genuinely unmatched shape.

**Testing**: `pr-review-loop-parity` 28/28; mutation-proved — removing arm 5 → red; softening HALT → red; restored → green. `npm run ci:fast` 3268/3267/0.

**Verification Steps for QA**: read the six arms against `PASS`+open LOW, `WAIVED`+`waiver.active: false`, and a gate with `gate: MAYBE`; each has exactly one instruction.

## Status History

| Date       | Status       | Changed By | Notes                    |
| ---------- | ------------ | ---------- | ------------------------ |
| 2026-09-13 | New          | QA         | Found by Step 3b reviewer (CR-1) |
| 2026-09-13 | In Progress  | qa-fix     | Investigation started    |
| 2026-09-13 | Ready for QA | qa-fix     | Fix implemented          |

# Bug Report: Task 116 - Outcome branching leaves two gate shapes unrouted

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
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

### Iteration 2

#### QA Verification (Ready for QA → Reopened)

**Date**: 2026-09-13 (QA cycle 2, CR-4)

**Reopening reason**: PARTIAL. Arm 5 and the malformed clause closed the two shapes named, but the arms use two definitions of "no queue": arm 1 reads "`PASS` with no `top_issues`" (an empty list) while arm 3 reads "no open entry" (empty, or every entry `status: closed`). A `PASS` whose entries are all `status: closed` — the shape `qa-fix`'s in-place gate update and the Step 10 example both produce — matches no arm and HALTs as malformed. `WAIVED` with `waiver.active` not `true` and no open entry is likewise unrouted. The stated matrix is not yet covered.

**Re-fix required**: arm 1 → "`PASS` with no open entry in `top_issues[]`" using arm 3's definition; route the inactive-`WAIVED`-with-no-open-entry cell explicitly (read an inactive waiver by its queue); drive the exhaustiveness test from the 8-cell matrix so a mutant that leaves a cell unrouted goes red (CR-6).

#### Fix Implementation — Iteration 2 (In Progress → Ready for QA)

**Date**: 2026-09-13

**Fix Description**: one definition of *open* stated once above the arms ("an entry is **open** when its `status:` is absent or reads `open`; no open entry = empty or all `status: closed`"); arm 1 now reads "`PASS` with **no open entry**"; arm 5 routes an inactive `WAIVED` by its queue — open entry → the `FAIL` road, no open entry → 5c like a `PASS`. The arms are the accepting-route set, stated as *a non-`FAIL` gate with no open entry, or an active `WAIVED`*.

**Testing**: the exhaustiveness test is now **matrix-driven** (CR-6): 8 cells × (claiming arm, claiming phrase, destination) with an exactly-one-claimant check, plus the shared definition and an arm-1 "not `no top_issues`" guard. Mutation-proved against: arm 1 → "no `top_issues`" (red), dropping the inactive-WAIVED-no-open cell (red), rewording the definition (red).

## Status History

| Date       | Status       | Changed By | Notes                    |
| ---------- | ------------ | ---------- | ------------------------ |
| 2026-09-13 | New          | QA         | Found by Step 3b reviewer (CR-1) |
| 2026-09-13 | In Progress  | qa-fix     | Investigation started    |
| 2026-09-13 | Ready for QA | qa-fix     | Fix implemented          |
| 2026-09-13 | Reopened     | QA         | Cycle 2: partial — see Iteration 2 |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 2: iteration 2 fix |
| 2026-09-13 | Closed       | QA         | Cycle 3: verified — one definition of open; matrix test covers 8 cells |

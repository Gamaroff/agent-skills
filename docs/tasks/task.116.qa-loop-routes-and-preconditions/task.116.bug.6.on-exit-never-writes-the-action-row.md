# Bug Report: Task 116 - The Diminishing-returns `On exit` steps never write the `Action` row the consumers now read

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-6
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 4 reviewer, CR-1)
**Date Found**: 2026-09-13

## Description

Cycle 3 made "reached 5c" a mechanical signal: the cycle entry's `**Action**` row reads `Proceeding to 5c`, and the resume contract and the PR conformance prompt now decide from it. The loop doc's new preamble (:257) claims 5a writes that value on every accepting route. It does not back the claim for route 2: the cycle entry is written before the guards run, the Diminishing-returns `#### On exit` list (:558–568) instructs only the `**Loop exit**` row, never the `**Action**` (or `**PR Review**` → `pending`) overwrite, and the entry template (:315) still offers the unreachable value `Proceeding to finalise`.

## Expected Behavior

Whichever route a gate takes, the entry's `**Action**` row is one of exactly `{Proceeding to 5c (PR conformance review), Running qa-fix (cycle N of 5), Escalating — loop not converging}` by the time the route is taken, and the exit's own steps say so.

## Actual Behavior

A route-2 run plausibly records `Proceeding to finalise` or leaves the 5b value — and both new consumers then decide the gate never reached 5c: the resume contract re-enters at 5a, the conformance prompt files a trail defect. The route-2 mis-handling cycle 3 set out to fix survives, one layer down.

## Recommendation

Add an explicit step to `On exit` (and to the FAIL/open arm's hand-off generally): once the guards resolve, overwrite `**Action**` to `Proceeding to 5c (PR conformance review)` and `**PR Review**` to `pending — 5c not yet run`. Drop `Proceeding to finalise` from the template. Pin the value set and the `On exit` step in the parity test.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-13 (qa-fix, cycle 4)

**Fix Description**: the Outcome-branching preamble now states the **post-guard write** rule — the `**Action**`/`**PR Review**` rows are overwritten when the route is known (directly for arms 1–3, after both guards for arms 4–5), with the closed value set `{Proceeding to 5c (PR conformance review), Running qa-fix (cycle {N} of 5), Escalating — loop not converging}`; the Diminishing-returns `On exit` list writes those two rows as its **first** step; `Proceeding to finalise` removed from the entry template.

**Testing**: new test "the Action row the consumers read has a writer on every route" pins the post-guard sentence, the value set, the absence of the dead value, and On-exit step 1 (with both row values). Mutation-proved: remove step 1 → red; re-add `Proceeding to finalise` → red; drop "post-guard write" → red. `npm run ci:fast` 3270/3269/0.

### Iteration 2

#### QA Verification (Ready for QA → Reopened)

**Date**: 2026-09-14 (QA cycle 5, CR-5)

**Reopening reason**: the fix is verified (post-guard write; On-exit step 1; closed set) — reopened only for the residue: the post-guard rule specifies the `**PR Review**` value for 5c and 5b but not for the third resolution of arms 4–5, the Convergence-check trip. **Re-fix**: state that the escalation arm writes `not reached — gate did not exit the loop` on `**PR Review**` beside `Escalating — loop not converging` on `**Action**`.

#### Fix Implementation — Iteration 2 (In Progress → Ready for QA)

**Date**: 2026-09-14 (operator, after the QA-loop escalation)

**Fix Description**: the post-guard write rule in `shared/resources/develop-pipeline-step-5-6-qa-loop.md` now names the third resolution of arms 4–5: when the Convergence check trips, the same write puts `**Action**: Escalating — loop not converging` and `**PR Review**: not reached — gate did not exit the loop` on the row. Bundled copies regenerated (commit `cf780a01`).

**Testing**: "the Action row the consumers read has a writer on every route" extended to assert the Convergence-trip sentence with both row values. Mutation-proved: sentence removed → 29/30 (that test red); restored → 30/30. `npm run ci:fast` 3270 tests, 0 fail.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-14 (QA cycle 6)

**Verification**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:266–268` names the Convergence-trip resolution with both row values; source and both bundled copies identical (`bundle --check` 127 / 0). QA mutation: PR Review value swapped → "the Action row the consumers read has a writer on every route" red (29/30), restored 30/30 → `covered`. One advisory note carried to gate 6 `recommendations.future`: the rule's "after both guards for arms 4–5" misstates arm 5's no-open-entry sub-case (medium confidence). **Closed.**

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-13 | New          | QA         | Cycle 4 reviewer (CR-1) |
| 2026-09-13 | Ready for QA | qa-fix     | Post-guard write + On-exit step 1 + closed value set |
| 2026-09-14 | Reopened     | QA         | Cycle 5: escalation-arm PR Review value |
| 2026-09-14 | Ready for QA | operator   | Iteration 2: Convergence-trip resolution named; test extended (post-escalation) |
| 2026-09-14 | Closed       | QA         | Cycle 6: verified; mutation-proven |

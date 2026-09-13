# Bug Report: Task 116 - Resume contract still keys the 5c sub-state on PASS/WAIVED

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-3
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute reviewer, CR-1)
**Date Found**: 2026-09-13

## Description

Route 3 adds a third accepting route out of 5a, but `shared/resources/develop-pipeline-resume-contract.md` (the 5–6 artifact rows at :82 and :92, and the 5c sub-state table at :129–130) still keys the 5c check on "the latest gate reads `PASS`/`WAIVED`". Every bundled `skills/*/references/` copy carries the same text.

## Steps to Reproduce

Kill a pipeline inside 5c after a `CONCERNS` gate with no open `top_issues[]` entry. Resume. The detector reads gate ≠ `PASS`/`WAIVED` and either (a) re-enters at **5a**, re-deriving the gate and burning a cycle, or (b) — via the 5–6 row's conditional, which only fires on `PASS`/`WAIVED` — scores Step 5–6 complete on artifacts + PR comment alone and proceeds to Step 7 with no terminal 5c verdict.

## Expected Behavior

The resume contract keys on "a gate that reached 5c" — `PASS` with no open entry, active `WAIVED`, or `CONCERNS` with no open entry — the same set §5c enumerates.

## Actual Behavior

The token pair. Outcome (b) is a run that leaves the loop without its exit gate — the invariant task 77 introduced and this task claims to preserve.

## Impact

HIGH: the loop's exit invariant has a hole on exactly the gate shape this task added.

## Recommendation

Rewrite the 5–6 rows and the 5c sub-state table to key on the accepting-route set (state it once by reference to §5c rather than restating the tokens), regenerate bundled copies, and extend `pr-review-loop-parity.test.mjs` to assert the resume contract does not carry the bare `PASS`/`WAIVED` premise.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-13 · **Developer**: Claude (qa-fix, cycle 2)

**Root Cause Analysis**: the accepting-route set was declared "stated once" in §5c while the resume contract restated it as the token pair in three places — the 5–6 artifact rows (story + task) and two rows of the 5c sub-state table — plus the "5c runs only on a clean gate" aside.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: all five sites now key on "**reached 5c**" and name the set by reference — *a non-`FAIL` gate with no open `top_issues[]` entry, or a `WAIVED` with an active waiver* — and the 5b-side phrasing reads "routed to 5b (`FAIL`, or any gate with an open entry not covered by an active waiver)". Bundled copies regenerated.

**Testing**: new test "the accepting-route set is stated once" in `pr-review-loop-parity.test.mjs` asserts the resume contract carries no `reads \`PASS\`/\`WAIVED\`` premise and ≥3 "reached 5c" sites; mutation-proved (reverting one row → red).

**Verification Steps for QA**: `grep -n 'PASS\`/\`WAIVED' shared/resources/develop-pipeline-resume-contract.md` → 0; read :82/:92/:129/:130.

### Iteration 2

#### QA Verification (Ready for QA → Reopened)

**Date**: 2026-09-13 (QA cycle 3)

**Reopening reason** (cycle 3, CR-1): PARTIAL as a rule. The token pair is gone, but the parenthetical restatement — *a non-`FAIL` gate with no open entry, or an active `WAIVED`* — omits §5c route 2 (the Diminishing-returns exit hands a `CONCERNS` gate with open test-machinery entries to 5c). A run killed between that exit and the 5c verdict re-enters at 5a. **Re-fix**: define "reached 5c" mechanically — the cycle's `**Action**` row in QA Iteration History reads `Proceeding to 5c` (written by 5a on every accepting route) — and point at §5c's three routes instead of restating any.

#### Fix Implementation — Iteration 2 (In Progress → Ready for QA)

**Date**: 2026-09-13 (qa-fix, cycle 3)

**Fix Description**: the 5–6 rows and both sub-state rows now read the **mechanical signal**: the highest `### QA Cycle {N}` entry's `**Action**` row reads `Proceeding to 5c` — 5a writes it on every one of §5c's three routes — with an explicit "do not re-derive the set from the gate". The 5b-side phrasing reads `Running qa-fix`. No paraphrase of the set remains in the file; the parity test forbids one.

**Testing**: `pr-review-loop-parity` 29/29; `npm run ci:fast` 3269/3268/0.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-13 | New          | QA         | Cycle 2 refute reviewer (CR-1) |
| 2026-09-13 | Ready for QA | qa-fix     | Five sites keyed on "reached 5c" |
| 2026-09-13 | Reopened     | QA         | Cycle 3: partial — see Iteration 2 |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 3: Iteration 2 fix |

# Bug Report: Task 99 - 5c's entry condition excludes the gate the new exit hands it

**Task**: [Link](./task.99.qa-loop-diminishing-returns-exit.md)
**Bug ID**: TASK-99-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-09-09

## Description

Two sections of one runnable document disagreed about whether a `CONCERNS` gate may reach 5c.

- The **Diminishing-returns exit** said it hands to 5c *"exactly as a `PASS` gate does"*.
- **5c** said *"Perform this step after a gate exits 5a with `PASS` or `WAIVED`"*.

A gate that takes the new exit is `CONCERNS` **by construction**: the exit's condition 2 requires a
non-empty `top_issues[]`, and any MEDIUM entry makes the gate CONCERNS under the deterministic gate
rules. So 5c's stated precondition excluded exactly the gate the exit sends it.

## Expected Behavior

One rule, in one place, about which gates 5c accepts.

## Actual Behavior

Two rules in one document. An orchestrator reading 5c first refuses the handoff; one reading the exit
section first proceeds. **The exit path was undefined** — not wrong, undefined, which is worse because
neither reading is a bug that would be noticed.

## Impact

The task's headline deliverable had no defined behaviour at its exit point. Note the symmetry: the
task's own §3 comparison table exists to stop the two *guards* being confused with each other; this
was the same class of ambiguity between the exit and its *destination*.

## Recommendation

State the accepted set once, in 5c, naming both routes.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-09

**Root cause**: the new section was written against what 5c *does* (it is the exit gate; everything
leaves through it) rather than against what 5c *says about what it accepts*. Both readings are
reasonable in isolation, which is why cycle 1's document-anchored review walked past it — cycle 1
verified the new section internally and against the task, not against the preconditions of the
section it hands to.

**Why the refute pass found it**: cycle 2 is contractually a re-read of the **whole** branch diff
rather than of the previous cycle's repairs. 5c's opening lines are in the original change's context,
not in cycle 1's diff, so a narrowed review would not have re-read them.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-09

**Fix Description**: 5c's entry condition now enumerates **two routes out of 5a** — the ordinary
`PASS`/`WAIVED` gate, and a gate that took the Diminishing-returns exit, with the reason that gate is
`CONCERNS` stated inline so it cannot be read as an oversight. "A gate that routes to 5b never reaches
it" is kept and extended (`neither route above routes to 5b`), because that sentence remained true and
is the load-bearing half.

A note records why route 2 is named rather than implied, so a later editor tightening the prose does
not re-collapse it: **the set of gates 5c accepts is stated in one place, and that place is 5c.**

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- `skills/{develop-story,develop-task}/references/develop-pipeline-step-5-6-qa-loop.md` — regenerated

**Testing**: `grep -n "exits 5a with\|after a gate exits"` now returns nothing — the excluding
formulation is gone rather than merely contradicted elsewhere. `npm run ci:fast` green at 2937/0;
Convergence check still byte-identical at 5624 bytes.

**Verification Steps for QA**:

1. Read 5c's opening and the Diminishing-returns exit's "On exit" step 2 together; confirm they
   describe one rule.
2. Confirm no other sentence in the file restricts 5c to `PASS`/`WAIVED`.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | New | QA Engineer | Found by the cycle-2 refute pass over the whole branch diff |
| 2026-09-09 | In Progress | qa-fix | Root cause: written against what 5c does, not what it says it accepts |
| 2026-09-09 | Ready for QA | qa-fix | 5c now enumerates both routes; the excluding formulation is removed, not merely contradicted |

# QA Report: Task 141 - cycle 5 (loop limit reached)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.5.qa-next-targeted-item.yml](./task.141.gate.5.qa-next-targeted-item.yml)
**Review Date**: 2026-09-22
**Gate Status**: FAIL — and the 5-cycle budget is spent

---

## Executive Summary

Cycle 4's pipe-escaping fix was **not idempotent**. `renderRow` escaped `|`; `splitCells` never
unescaped it. Since `updateRow` re-renders every row it parses, each `--set` re-escaped an
already-escaped pipe and the backslashes grew by one per rewrite — with `--check` green throughout
and the backslashes handed to the skill in `--item --json`. That is a HIGH, and it was introduced by
the previous cycle while fixing a different defect in the same function.

Four findings, all fixed in this cycle and each mutation-proved. **But the loop's 5-cycle budget is
now spent and no gate has read those fixes.** This is the loop-limit escalation, not a clean exit.

---

## Review Methodology

Scoped to the three files the cycle-4 commit (`969f126e`) changed, against the PR base. The review
was **dispatched** and returned in 3m46s, having run the suite (36/36) and driven the real CLI over
five throwaway fixtures — including the round-trip idempotence probe this report's top finding came
from. It reported five findings; the QA step had independently reached none of them.

---

## Re-Review Context — cycle 4's findings

| Finding | Status | How verified |
| :--- | :--- | :--- |
| BUG-9 pipe corruption | **Fixed, then broken differently** | The escape works; the missing unescape is BUG-11 below |
| BUG-10 newest bug link | **Fixed**, with a consequence | `describeRow` takes the last; `checkRegistry` still validated the first — BUG-12 |
| CR4-3 bounded append | **Fixed, then withdrawn** | The suppression could not be made correct — BUG-13 |
| CR4-4 STATES population test | **Fixed, partly vacuously** | The test probed the tool only for `true` requirements — CR5-5 |
| CR4-5 README "Last run" | **Fixed in README only** | `SKILL.md` carried the same sentence — CR5-4 |

Every one of cycle 4's five fixes produced a cycle-5 finding. That is the honest summary.

---

## New Findings This Cycle — all fixed in-cycle

- **[high] BUG-11** — render and parse were not inverses. Reproduced: an authored `Submit a \| b`
  became `Submit a \\| b` after two `--set`s and kept growing, `--check` green. Fixed by unescaping
  in `splitCells`; the test asserts **idempotence of the whole round trip**, because asserting
  either half alone would have missed it.
- **[medium] BUG-12** — `checkRegistry` validated the first bug link while `describeRow` returns the
  last, so `--check` proved a different file exists from the one Step 4 opens. Fixed by validating
  **every** link in the cell, which is strictly stronger and removes the divergence rather than
  re-aligning two readers that could drift again.
- **[medium] BUG-13** — the append's duplicate suppression could not be made correct. ` · ` is the
  registry's separator **and** legal inside a note, so no string comparison distinguishes a tail
  segment from a compound note's tail. Three formulations were tried; each dropped a genuinely new
  note or let a duplicate through. **The suppression was removed**, not approximated: a dropped note
  is silent data loss, a repeated segment is visible noise. The growth is recorded as an accepted
  limitation, with the real fix named (an out-of-band separator or a structured cell) so a future
  attempt does not reach for a fourth comparison rule.
- **[low] CR5-5** — cycle 4's STATES population test probed the tool only when a requirement was
  `true` and discarded the moves-accepted column, so a state classified `[false,false,false]` — the
  exact default the finding was about — passed having asserted nothing. The forcing function was
  partly vacuous. Now asserts both polarities and the moves-accepted column, with a count.
- **[low] CR5-4** — `SKILL.md` still carried the "updates Last run" sentence that CR4-5 qualified in
  `README.md`. The **fourth** cycle in which a fix updated one statement of a rule and not its twin.

---

## Verification of the cycle-5 fixes

| Mutation | Test that went red | Outcome |
| :--- | :--- | :--- |
| M26 `splitCells` stops unescaping | round-trip idempotence | `covered` |
| M27 `checkRegistry` back to the first link | every-bug-link | `covered` |
| M28 suppression reinstated | never-drops-a-note | `covered` |
| M29 a state mis-classified as requiring nothing | STATES population | `covered` |

29 mutations across five cycles; none survived. `npm test` 3941 green, `validate` green,
`check:generated` and `bundle --check` clean, Prettier clean.

---

## Why this escalates rather than exits

The loop's budget is **five complete cycles** and five have run. Route 2c (the gate-the-last-fix
half-cycle) requires that the last gate raised no HIGH; gate 5 raised one. So the documented outcome
is the **loop-limit escalation**, and continuing into a sixth cycle would be the silent budget
breach the bound exists to prevent.

What the operator is being handed is therefore a specific and slightly unusual state: **every known
finding is fixed, mutation-proved and green — and the last round of fixes has not been reviewed by
anyone.** Four of the five cycles found a defect in the previous cycle's fix, so "fixed and green"
has not, on this branch, been a reliable predictor of "correct".

The convergence check did not fire: HIGH counts by gate were 1, 1, 1, 0, 1 — not a monotonic stall.
The pattern is not a loop failing to converge on one defect; it is a small, unusually sharp-edged
area (one table cell, one in-band separator, one escape) where each correct-looking fix has had a
consequence one layer out.

---

## Final Assessment

**Gate Status**: FAIL (loop limit)
**Quality Score**: 60/100
**Deployment**: staging CONDITIONAL, production BLOCKED — pending a gate on the cycle-5 fixes.

**Recommended**: grant 1–2 further cycles. The next cycle has a specific job — review the four
cycle-5 fixes — rather than an open remit, and on this branch a dispatched review has found
something in every cycle it has run.

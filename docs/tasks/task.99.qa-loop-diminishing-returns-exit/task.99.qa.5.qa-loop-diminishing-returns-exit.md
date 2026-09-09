# QA Report: Task 99 - A diminishing-returns exit for the QA loop (cycle 5)

**Task**: [Link to task document](./task.99.qa-loop-diminishing-returns-exit.md)
**Gate File**: [task.99.gate.5.qa-loop-diminishing-returns-exit.yml](./task.99.gate.5.qa-loop-diminishing-returns-exit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: PASS

---

## Executive Summary

Cycle 4's MEDIUM is fixed, and each of its three route-table rows was verified against the document's
own statements elsewhere rather than against the table's internal consistency. All twelve success
criteria mechanically re-verified. Third consecutive zero-HIGH cycle, no finding above LOW.

**Overall Assessment**: PASS · **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Cycle 4 finding | Status | Verification |
| :--- | :--- | :--- |
| TASK-99-008 — the route note's `WAIVED` row was false | **FIXED** | Now a three-row table. Row 1 (`PASS` → empty) follows from the deterministic gate rules; row 2 (`WAIVED` → HIGH entries with `waiver.active`) checked against line 339 and line 253, both of which say so independently; row 3 (route 2 → machinery residue) matches the exit section |

**Re-review scope**: since gate 4 — 6 files, one of them the shared resource plus its two bundled
copies.

---

## New Findings This Cycle

**None above LOW.** One LOW, recorded in `recommendations.future` and **deliberately not fixed**: the
exit section's "Hand to 5c, exactly as a `PASS` gate does" now sits beside a table distinguishing what
a `PASS` gate and a route-2 gate carry. The handoff mechanics genuinely are the same, so the sentence
is not false; "as route 1 does" would remove the friction.

Leaving it is the point. **It is machinery of the prose around the rule, not the rule** — and refining
it is exactly the behaviour this task ships a guard against. Recording that judgement rather than
acting on it is what the guard asks a reviewer to do.

---

## Criteria verification — mechanical, this cycle

| # | Criterion | Check | Result |
| :-- | :--- | :--- | :--- |
| 1 | Section placed after Convergence check, before 5b; 3 conditions + floor | line numbers 334 / 419 / 522 | ✅ |
| 2–6, 10 | Fires / does not fire / anti-vacuity / no-`file:` / the engine is the subject | `node --test` | ✅ 33/33 |
| 7 | Config key in schema, key reference and prose, fail-safe stated | 3 occurrences in `configuration.md` | ✅ |
| 8 | Escalation table distinguishes the clean exit from a stall | the "not one of them" note | ✅ |
| 9 | Convergence check byte-unchanged, **by diff** | 5624 bytes both sides | ✅ |
| 11 | The exit hands to 5c | "On exit" step 2, and 5c's route 2 | ✅ |
| 12 | `npm run bundle` run, copies committed | re-run: 0 files changed | ✅ |

Plus repo hygiene: `npm run validate:all` → 126 skills passed, 0 failed; both new cross-links resolve
from their source directories.

---

## The exit, run against this run's own final gate

```
describeDiminishingReturns(r):
  "Diminishing-returns exit not taken (no-residue) — the gate raises no findings at all;
   there is no residue to classify, and a clean gate exits through 5c on the ordinary path."
```

That is **property 3 firing on a live gate**: an empty `top_issues[]` makes condition 2 vacuously
true, and the rule declines anyway rather than taking a vacuous exit. Across this run the exit has now
declined for three distinct and correct reasons — `high-findings-remain` (cycle 3),
`non-test-finding` (cycle 4, globs unset), and `no-residue` (cycle 5) — and fired once, when the globs
were configured to cover the residue. Four of its reason codes exercised on real gates.

---

## NFR Assessment

All four **PASS**; see the gate file for the notes. Reliability is worth one line here: the cycle-1
silent-failure mode is closed and mutation-proved, and the fail-safe default was verified **live** this
run rather than asserted — with condition 1 satisfied and `qa.testArtifactGlobs` unset, the exit
declined.

---

## Code Review

`shared/resources/qa-diminishing-returns.js` has been **untouched since cycle 1**. Its 33 tests and
nine mutations have held across four subsequent cycles. Independence caveat unchanged — in-line pass,
not an independent subagent; recorded in every cycle's report.

**Step 3c** — nothing new to mutation-prove. All nine existing mutations re-run; all nine still go red.

---

## What this loop cost, and what it bought

Five cycles, eight findings: 2 HIGH, 5 MEDIUM, 1 promoted LOW. Worth stating plainly because this task
is about loop cost:

- **Every finding after cycle 1 was in the prose, not the engine.** The engine took one HIGH at cycle 1
  and nothing since.
- **Three consecutive cycles found a defect introduced by the previous cycle's fix** — 005 from cycle
  1's, 007 from cycle 2's, 008 from cycle 3's. That is qa-fix's *"a fix is new code, not the closure of
  a finding"* holding three times running, and the argument for its Step 3.5.
- **Would this task's own rule have cut the loop short?** No, and correctly. Condition 1 was first
  satisfied at cycle 4; condition 2 never was, because the residue was prose rather than test
  machinery and this repository has no `qa.testArtifactGlobs`. The findings were real product defects
  in the deliverable, not pin-refinement — which is exactly the distinction the rule draws.

---

## Regression Testing

```
npm run ci:fast                →  2937 tests, 0 failures
npm run validate:all           →  126 skills passed, 0 failed
npm run bundle                 →  0 files changed (already in sync)
Convergence check vs develop   →  byte-identical (5624 both sides)
```

**Regression Assessment**: PASS

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100
**Rationale**: no HIGH, no MEDIUM, all twelve criteria verified mechanically. The LOWs are recorded
and deliberately unfixed.

**Deployment Recommendation**: APPROVED

---

**Next Steps**: the gate hands to **5c** — `/review-pr`, the loop's exit gate.

# QA Report: Task 99 - A diminishing-returns exit for the QA loop (cycle 4)

**Task**: [Link to task document](./task.99.qa-loop-diminishing-returns-exit.md)
**Gate File**: [task.99.gate.4.qa-loop-diminishing-returns-exit.yml](./task.99.gate.4.qa-loop-diminishing-returns-exit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's MEDIUM is fixed. One MEDIUM this cycle, in the note cycle 3 added: it says a route-1 gate
carries an empty `top_issues[]`, which is true of `PASS` and false of `WAIVED` — and the same file
contradicts it twice, eighty lines up and again in the outcome-branching list. Second consecutive
zero-HIGH cycle.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 3 finding | Status | Verification |
| :--- | :--- | :--- |
| TASK-99-007 — route 2 falsified 5c's empty-`top_issues` claim | **FIXED** | The sentence is generalised ("on neither route into 5c does that gate carry the review's findings") and the route detail moved into a note where each claim can be checked individually — which is how TASK-99-008 was found |

**Re-review scope**: since gate 3 — 6 files, one of them the shared resource plus its two bundled copies.

---

## New Findings This Cycle

- **[MEDIUM]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the route note's route-1 row
  is false for `WAIVED`. **TASK-99-008**, fixed this cycle.

---

## The live demonstration — this is the strongest evidence in the task

Cycle 4 is the first cycle where **condition 1 is satisfied**: HIGH `1, 1, 0, 0`, two consecutive
zero-HIGH gates. Both guards were run against the real sequence and the real gate file:

```
Convergence check @ cycle 4:
  HIGH_4 >= HIGH_3  →  0 >= 0  true
  HIGH_3 >= HIGH_2  →  0 >= 1  FALSE      →  does NOT trip          ✅ correct

Diminishing-returns @ cycle 4, qa.testArtifactGlobs unset (this repo):
  continue | non-test-finding                                        ✅ correct

Diminishing-returns @ cycle 4, globs configured to cover the residue:
  exit | diminishing-returns                                         ✅ correct
```

Three things are shown here that no fixture can show:

1. **The fail-safe default is real, not asserted.** This repository has never set
   `qa.testArtifactGlobs`. Condition 1 holds, condition 3 holds, and the exit still declines — purely
   because `[]` matches nothing. That is criterion 7 demonstrated on a live run.
2. **The two guards do not overlap on a real sequence.** Criterion 3 was previously shown against the
   `7,7,7,7,4` fixture; here it holds on a sequence neither guard was designed against.
3. **The exit is reachable.** Configure the globs to cover the residue and it fires, with the right
   reason. A rule that could never fire would be indistinguishable from a broken one, and this
   separates them.

---

## Issues Found

### MEDIUM (1)

**TASK-99-008** — the route note's `PASS`/`WAIVED` row. A `WAIVED` gate carries its HIGH
`top_issues[]` with `waiver.active: true` — the Convergence check section says so, and the
outcome-branching list already names the consequence: re-running qa-fix on them "would churn against
an intentionally-waived gate". So on route 1 with a WAIVED gate plus REQUEST CHANGES, qa-fix is handed
deliberately-waived HIGH findings and works them. Same shape as TASK-99-007, different route.

Honest attribution: **the falsehood predates this change set** — the original sentence said the same
thing. What changed is that cycle 3 restated it in a note whose entire subject is what each route's
gate carries, which is where a reader will now look for the answer. Restating a false claim after this
much scrutiny is worse than the original oversight, so it is fixed rather than deferred as
pre-existing.

**Fixed this cycle**: the note is now a three-row table — `PASS` (empty), `WAIVED` (waived HIGH
entries), `CONCERNS` via route 2 (machinery residue) — with one rule across all three: only the
review's findings, which arrive in the `pr_review=` report, are the work.

### LOW (5, carried)

Unchanged, all in `recommendations.future`. Still correctly unfixed.

---

## NFR Assessment

Security / Performance — PASS, unchanged (prose only). Reliability — PASS: TASK-99-007 is closed and
the replacement structure is what surfaced the next defect, which is the structure working.
Maintainability — PASS: a table answering "what does each route's gate carry" in one place is
checkable row by row, which prose was not.

---

## Code Review

No code changed since gate 2. `shared/resources/qa-diminishing-returns.js` is untouched for the third
consecutive cycle. Independence caveat unchanged.

**Step 3c** — nothing new to mutation-prove. The nine existing mutations were re-run; all nine still
go red.

---

## Regression Testing

```
npm run ci:fast                →  2937 tests, 0 failures
npm run bundle                 →  both copies in sync
Convergence check vs develop   →  byte-identical (5624 both sides)
```

**Regression Assessment**: PASS

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 — `100 - (10 × 1 MEDIUM)`
**Rationale**: no HIGH for a second consecutive cycle; one MEDIUM, fixed in the same cycle.

**Deployment Recommendation**: CONDITIONAL — TASK-99-008 resolved; re-review to confirm.

---

**Next Steps**: re-review (cycle 5 — the last of the budget). If clean, the gate hands to 5c.

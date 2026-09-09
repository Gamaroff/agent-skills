# QA Report: Task 99 - A diminishing-returns exit for the QA loop (cycle 3)

**Task**: [Link to task document](./task.99.qa-loop-diminishing-returns-exit.md)
**Gate File**: [task.99.gate.3.qa-loop-diminishing-returns-exit.yml](./task.99.gate.3.qa-loop-diminishing-returns-exit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's HIGH is closed **at the root** — the excluding formulation is gone, not contradicted
elsewhere, which is the difference between a fix and a second opinion. Zero HIGH this cycle.

One MEDIUM, and it is instructive: it is a **direct consequence of cycle 2's own fix**. Widening 5c
to admit route 2 falsified a sentence eighty lines further down 5c, which asserts that a gate reaching
it carries an empty `top_issues[]`. The behavioural consequence is the sharp part — on route 2 plus a
REQUEST CHANGES verdict, `/qa-fix` receives the machinery residue this exit deliberately declined to
fix, and works it. **The loop resumes refining the pins through the back door**, which is the one
outcome this task exists to prevent.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 2 finding | Severity | Status | Verification |
| :--- | :--- | :--- | :--- |
| TASK-99-004 — 5c excludes the gate this exit hands it | HIGH | **FIXED** | `grep -n "exits 5a with\|after a gate exits"` returns nothing — the formulation is removed rather than overridden. 5c now enumerates two routes and says why route 2's gate is CONCERNS |
| TASK-99-005 — `**Loop exit**` default was false | MEDIUM | **FIXED** | Template row and its explanatory note both read `n/a — this exit not taken`; the implementation report's own two cycle entries were corrected in the same pass |
| TASK-99-006 — three stale "32 tests" | MEDIUM | **FIXED** | Both remaining occurrences are historical (a dated Change Log row; a description of the finding itself), which is correct — a change log records what was true when written |
| 3 × LOW carried | LOW | **NOT FIXED — correctly** | Carried to gate 3 |

**Re-review scope**: since gate 2 (default narrowing) — 8 files, of which one is the shared resource
and two are its bundled copies. The narrowing is right at cycle 3: cycle 2's unnarrowed pass has
already re-read the original change with what cycle 1 learned.

---

## New Findings This Cycle

- **[MEDIUM]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — 5c's REQUEST CHANGES arm
  still asserts the arriving gate "reads `PASS`/`WAIVED` with an empty `top_issues[]`", which route 2
  falsifies; and the consequence is that qa-fix would work the carried machinery residue. **TASK-99-007.**

That is the whole list. Cycle 2's fixes were otherwise clean, and the one defect they introduced was
found by asking the same question of the fix that cycle 2 asked of the original: *what does this now
make false elsewhere?*

---

## The dogfood check

The rule this task ships was run against **this run's own gate sequence**, using the engine and the
Convergence check's own awk:

```
HIGH sequence:  1, 1, 0        (gates 1, 2, 3)

Convergence check at cycle 3:   0 >= 1 is false  →  does NOT trip
Diminishing-returns at cycle 3: continue | high-findings-remain
  "HIGH is 1 then 0 — condition 1 needs two consecutive zero-HIGH gates.
   A run whose HIGH count is non-zero and flat is the Convergence check's, not this one's"
```

Both guards correctly decline, for the right reasons and without overlapping — which is success
criterion 3 demonstrated on a real sequence rather than on a fixture. Worth stating plainly: this run
would **not** have taken its own exit, and should not have. One quiet cycle is not two.

---

## Issues Found

### MEDIUM Severity Issues (1)

**TASK-99-007 — route 2 falsifies 5c's own empty-`top_issues` claim**

- **Observation**: 5c line ~101 — *"the ordinary 5b invocation passes the latest gate file, and on
  this path that gate reads `PASS`/`WAIVED` with an empty `top_issues[]` — it carries none of the
  review's findings."* True of route 1; false of route 2, whose gate is `CONCERNS` with a
  deliberately non-empty `top_issues[]`.
- **Impact**: on route 2 + REQUEST CHANGES, `/qa-fix` is handed the machinery findings the exit
  declined to fix, and its priority order will work them. The loop resumes refining pins. The path is
  narrow — it needs 5c to request changes on a diminishing-returns exit — and it is bounded by the
  5-cycle budget, which is why this is MEDIUM and not HIGH. But it reopens the exact behaviour the
  task closes, so it should not ship.
- **Recommendation**: qualify the sentence for both routes and state that route 2's carried residue
  is **not** the fix target — only the review's findings are. The `pr_review=` argument already
  carries those, so no mechanism changes; the missing piece is the instruction.

### LOW Severity Issues (4)

Three carried unchanged from gates 1 and 2, plus one new, recorded rather than fixed:

- The cycle-2 PR comment claimed gate 1's preamble LOW was *"incidentally resolved"*. It is
  **improved** — the preamble now mirrors 5c's two routes — but "two ways the loop reaches Step 7"
  still sits beside "only 5c opens Step 7". Recording the overclaim rather than letting it stand.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

**Security / Performance — PASS**, unchanged; cycle 2 touched prose only.

**Reliability — PASS.** TASK-99-004 is closed at the root, verified by grep for the *absence* of the
old formulation rather than by reading the new one. That distinction matters here: a replacement can
be correct and still leave the superseded rule in the file for an orchestrator to read first.

**Maintainability — PASS.** 5c's new note explains *why* route 2 is named rather than implied, which
is the kind of comment that survives an editor tightening prose — it says what breaks if the
distinction is collapsed.

---

## Code Review

No code changed since gate 2 (`shared/resources/qa-diminishing-returns.js` untouched). The diff is
prose plus the two regenerated bundle copies. Independence caveat unchanged.

**Step 3c** — no new fix to mutation-prove this cycle. The eight condition mutations and the cycle-1
case-fold mutation were re-run and all nine still go red.

---

## Regression Testing

```
npm run ci:fast                              →  2937 tests, 0 failures
npm run bundle                               →  both copies in sync
Convergence check vs develop                 →  byte-identical (5624 both sides)
```

**Regression Assessment**: PASS

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; one MEDIUM that reopens the task's own subject through a narrow path and
should not ship.
**Quality Score**: 90/100 — `100 - (10 × 1 MEDIUM)`

**Deployment Recommendation**: CONDITIONAL — resolve TASK-99-007.

---

**Next Steps**: `/qa-fix` cycle 3 against TASK-99-007, then re-review.

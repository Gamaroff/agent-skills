# Sprint Review Summary — Task 74

**Task:** A security re-review must re-probe, not re-read
**Status:** ✅ Accepted · **Date:** 2026-09-02 · **PR:** [#299](https://github.com/Gamaroff/agent-skills/pull/299)

---

## Summary

A QA re-review is scoped to the files that changed since the last gate. That is right for cost and
wrong on one axis: **after a security FAIL, the files that changed since the last gate are precisely
the fixes** — so the re-review inspects the patch and never re-reads the surface the patch was meant to
protect. This adds a narrow carve-out keyed on the prior gate's *safety state*.

The failure was measured, not theorised. On task 67, cycle 1 found 13 fail-open holes in a safety
boundary and returned FAIL; the fixes closed all 13; cycle 2 re-tested those 13, found nothing new, and
returned PASS 90/100 with `security: PASS`. The DoD gate then found **14 more of the same class**, two
of them commands the code deny-listed by name. Two green gates read as converging evidence. They were
one piece of evidence counted twice.

## What was delivered

| Phase | Deliverable |
| --- | --- |
| 1 | `shared/resources/qa-re-review-scope.md` — the rule stated once: trigger, non-triggers, what fires, and the canonical probe |
| 2 | `SAFETY_REPROBE` as a **disjunct on the existing guard** in `qa-task` and `qa-story`, plus a SAFETY RE-PROBE directive |
| 3 | `## New Findings This Cycle` in both report templates, required *even when empty*; scope decision recorded |
| 4 | `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — 34 tests, 4 of which **execute** the probe against real fixtures |

## Scope correction made before implementing

Commit `61197c3` landed the same day the task was filed and already gave **cycle 2** a full-branch diff
plus a refute directive. The task's §3 described an architecture that no longer existed. It was re-aimed
at the genuine residual gap: **cycle 3+** after a safety failure is still diff-scoped, and the cycle-2
refute directive anchors on *the fixes* rather than *the surface*.

## Quality

| Gate | Result |
| --- | --- |
| QA cycle 1 | CONCERNS 90/100 — 1 MEDIUM, 2 LOW |
| QA cycle 2 (refute pass) | **PASS 100/100** |
| `npm run ci` (merge gate, incl. `eval:all`) | ✅ EXIT=0 — 2202 pass / 0 fail |
| CI rollup on `dff240db` | ✅ SUCCESS — 4/4 workflows |
| Security probe mode | 12 candidates executed, **0 reproduced** — boundary held |
| Mutation proofs | 18 across the run, each red then restored green |

## What the pipeline caught that reading would not have

This task is about the difference between re-reading and re-probing, and the run kept demonstrating it
on itself:

1. **A `\s` in the trigger probe.** A GNU extension BSD awk and mawk neither match nor error — the probe
   would have returned empty, the carve-out would never have fired, **silently**. The same failure mode
   the task exists to prevent, one layer down. Reading it found nothing; replaying it against a fixture
   whose answer was known found it immediately.
2. **A probe that hung** on an empty `$LATEST_GATE` (QA cycle 1, CR-1) — `awk` with no filename reads
   stdin and blocks forever. A hang, not an error, with no diagnostic.
3. **A fix that did not work.** Cycle 2's refute pass found CR-2 had been recorded as fixed while
   changing nothing observable — a module-level call defeated the lazy read it introduced.
4. **Two vacuous regression tests of my own**, both passing. Mutation proving caught both.
5. **A file overwritten by its sibling.** A backup-filename collision put qa-story's entire content into
   `qa-task/SKILL.md`; **all 28 tests stayed green**, because a parity suite comparing two files that
   should say the same things cannot see one becoming the other. Found by `git diff --stat`. The suite
   gained an identity guard.
6. **A dead link and a third stale copy of the rule**, both at the DoD gate.

## Impact

Closes the specific hole that let 14 defects reach a DoD gate behind two green ones, and costs nothing
on the common path — a re-review after CONCERNS on maintainability behaves exactly as before.

## Known limitations

- Clauses 2 and 3 of the trigger (a boundary-concerning HIGH finding; safety vocabulary in the work
  item's own criteria) remain **judgement calls**. Only clause 1 is mechanical and executable.
- `zero-blocks-executed` still fires on every skill whose documented commands are all correctly
  refused — [bug.7](https://github.com/Gamaroff/agent-skills/pull/298), unrelated to this task, now with
  a third confirming data point.

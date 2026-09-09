# Sprint Review Summary — Task 82

**Task:** Feed the measured security verdict into the QA gate
**PR:** [#362](https://github.com/Gamaroff/agent-skills/pull/362)
**Accepted:** 2026-09-09 · **Gate:** PASS 100/100 · **QA cycles:** 2

---

## Summary

A QA gate's `nfr_validation.security` was `{status, notes}`. A `PASS` reached by **executing** twelve
hostile candidates and one reached by **reading** the diff rendered as the same sentence — while the
most rigorous consumer in the system, task.74's `SAFETY_REPROBE`, parsed that field mechanically.
**The most exacting trigger in the pipeline was fed by its least exacting input.**

This task adds `evidence: measured | reasoned | unverified` and `probes_executed:` to that block, and
teaches the trigger to read them.

## What shipped

- **The field**, below `status:` — the probe reads the first `status:` after `security:`, and a key
  reaching that slot first breaks it closed and silently.
- **One definition**, `shared/resources/qa-gate-security-evidence.md`, referenced from `qa-story`,
  `qa-task` and the re-review rule rather than restated — the drift task.74 found three copies of.
- **A widened clause 1** whose two halves fail in **opposite directions**: `status` fails closed
  (an unreadable gate is not evidence of failure), `evidence` fails **open** (a missing key reads as
  `unverified` and fires). Written the other way, every gate predating the field reports "no trigger"
  and the change accomplishes nothing while appearing to work.
- **`review-security` wired through** — same key names, so a QA cycle lifts rather than translates.
  The domains are nested, not equal: `unverified` is gate-only, because a review that ran always
  reaches `measured` or `reasoned`.

## Demo notes

The clearest demonstration is the task's own gate file. `task.82.gate.2` carries
`evidence: measured, probes_executed: 24`, and run through the shipped probe it resolves to
`OK measured` and correctly does not fire. Delete its `evidence:` line and it fires.

## Testing & QA

58 tests, up from 34. **7/7 mutations proven** — each names its exact edit and its red count.

**Five defects, every one found by running something rather than reading it** — which is the task's
own thesis applied to itself:

1. The new awk program named the whole-record variable; invoking the skill with an argument
   substituted the invocation path into it. Found by *this task's own QA step invoking the skill.*
2. An apostrophe in the comment written to fix (1) closed the single-quoted program — 18 tests red.
3. The new corpus check used `git ls-files`, so it could not see the **uncommitted** gates it exists
   to judge. Found by mutation-proving — the check's own proof failing to fail.
4. An empty reading was treated as `absent`, so a corrupted reader silently disabled the carve-out.
   Found by the cycle-2 refute pass running the probe with an `awk` that exits 127.
5. The first fix for (4) swallowed every clean reading — 7 tests red.

## Impact

Going-forward only; no backfill. Every existing gate now reads `evidence: unverified` and therefore
fires the re-probe — correct and intended, and it means the trigger stays uninformative until
adoption spreads. The honest framing: the field makes the current state **visible** immediately, and
useful once something can write `measured`.

## Known limitations

- **Clause 1 has been executed under bash only.** The suite spawns no zsh, and this snippet's own
  history records a GNU-vs-BSD `awk` divergence. Named in both gates rather than absorbed into a PASS.
- **The probe is copied prose, in three files.** It now carries three transit constraints, each with
  its own test. The threshold is written into the rule: a **fourth** means stop copying and extract
  to a script.
- **`estimated_effort_hours` left at 4** against an actual nearer 8, knowingly — revising an estimate
  after the fact turns it into a record of the outcome.

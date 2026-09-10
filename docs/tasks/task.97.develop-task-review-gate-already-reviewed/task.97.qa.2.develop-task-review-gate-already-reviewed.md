# QA Report: Task 97 — cycle 2 (refute pass)

**Task**: [task.97.develop-task-review-gate-already-reviewed.md](./task.97.develop-task-review-gate-already-reviewed.md)
**Gate File**: [task.97.gate.2.develop-task-review-gate-already-reviewed.yml](./task.97.gate.2.develop-task-review-gate-already-reviewed.yml)
**Review Date**: 2026-09-08
**QA Cycle**: 2 of max 5 — **refute pass** (mandatory at cycle 2)
**PR**: [#350](https://github.com/Gamaroff/agent-skills/pull/350)
**Gate Status**: FAIL (at review) — all 8 findings closed in the same cycle

---

## Executive Summary

Cycle 2 is a refute pass: an agent that did not write cycle 1's fixes was asked to find the false claim in them rather than confirm they work. It found one, and it is the sharpest finding of the whole task:

> **Two of cycle 1's own fixes cancelled each other out.** Comment-stripping ran on lines *inside* an open fence, and its output was then re-tested as a fence delimiter — so a fenced example containing `<!-- template -->` followed by a backtick run closed its own block and released the example as live prose. The module was still defeatable, by a report whose real date was six years older than the task.

That is the *same* over-permissive skip cycle 1 set out to close, reopened through the interaction of two fixes that were each correct alone. It is exactly the failure mode the refute directive names — "a fix is new code, not the closure of a finding" — and it would not have been found by re-reading the fixes, only by attacking them.

**Findings**: 2 HIGH, 4 MEDIUM, 2 LOW — all closed this cycle.
**Convergence**: HIGH count 3 → 2. Reducing.

---

## Re-Review Context — cycle 1's findings

| ID | Status | Verification |
| --- | --- | --- |
| TASK97-001 (comment/indent) | **PARTIAL → now FIXED** | The indent half held. The comment half was defeated by TASK97-011 below |
| TASK97-002 (`\s*` spans newlines) | FIXED | Confirmed: a bare label no longer adopts a later date |
| TASK97-003 (fence run length) | **PARTIAL → now FIXED** | Held against nested fences, but bypassable via the comment path |
| TASK97-004 (thematic break) | FIXED | Confirmed; boundary now pinned by a test |
| TASK97-005 (calendar range) | **PARTIAL → now FIXED** | Month/day held; the year field was never checked (TASK97-017) |
| TASK97-006 (CRLF) | FIXED | Confirmed — and its test turned out vacuous (TASK97-015) |
| TASK97-007 (prose table) | FIXED | Third `Planned` row present; table exhaustive over fresh/stale/absent |
| TASK97-008 (eval scenario) | **NOT FIXED → made worse, then corrected** | Cycle 1 strengthened the *claim* without the assertion (TASK97-016) |
| TASK97-009 (never throws) | FIXED | Confirmed |
| TASK97-010 (`__proto__`) | FIXED | Confirmed — test was vacuous, now has a load-bearing sibling |

## New Findings This Cycle

- **[HIGH] TASK97-011** — fix 1 and fix 3 cancel out (above). Reproduced at 3 and 4 backticks, so the `{char,len}` fix did not block it.
- **[HIGH] TASK97-012** — "**Only `fresh` skips**" is false of four of the six skip rows, in the unsafe direction. The sentence sat unqualified between the two tables; the `Ready for Development` and `In Progress` rows in **both** tables still skip on presence alone.
- **[MEDIUM] TASK97-013** — dotted (`jira.key:`) and quoted (`"updated":`) keys voided the whole frontmatter block.
- **[MEDIUM] TASK97-014** — the documented `require()` path offered `develop-bug`, which has no copy of the engine. MODULE_NOT_FOUND for anyone following it.
- **[MEDIUM] TASK97-015** — two tests passed with the behaviour they name reverted.
- **[MEDIUM] TASK97-016** — the eval scenario's claim was strengthened while its assertions stayed on unwritten input fixtures.
- **[LOW] TASK97-017** — year 0 passed the range check.
- **[LOW] TASK97-018** — `argv[1]` is `-e`-specific and the prose invites lifting the body into a file.

**Verified sound** (the refute pass tried and could not defeat): tab-indented dates; 4-space indent; blockquote and table-cell dates; orphan `-->`; a fence opener hidden in a multi-line comment; `~~~` closed by ` ``` `; an info-string opener; a closer longer than its opener; a bare label adopting the next line's date; `2026-02-29` and `2026-99-99`; CRLF on both sides; whitespace-only and null input; throwing getters; `__proto__` pollution.

---

## Fixes Applied (same cycle)

| ID | Fix | Mutation-proved |
| --- | --- | --- |
| 011 | Fences resolved from the **raw** line before any comment handling; comments never parsed inside a fence — which is also what the format says | ✅ **RED (8 tests)** |
| 012 | Sentence scoped to the `Planned` row, with a ⚠️ note stating why the two promoted statuses are exempt and what to do if that reasoning is falsified | prose |
| 013 | Key pattern widened to quoted and dotted keys; a quoted key normalises to its bare name | ✅ RED (1) |
| 014 | Placeholder narrowed to the two skills that bundle the engine, said explicitly | prose |
| 015 | Load-bearing siblings added: a CRLF **fenced** example (survives only if lines split on `\r\n`) and a genuine prototype-inheritance probe | ✅ RED (2) |
| 016 | Description now states the limitation and names where the real net is | fixture |
| 017 | Year bounded at ≥ 1000 | ✅ RED (1) |
| 018 | Noted that the indexing is `-e`-specific | prose |

Also removed: the `inComment` reset on fence-open, which the new ordering made unreachable. It was surfaced *by* a mutation that would not go red — the honest signal that a line is dead.

**Two guards are redundant by design and this is recorded rather than papered over.** `Object.create(null)` and the `hasOwnProperty` read-guard each independently prevent prototype inheritance, so neither is individually mutation-provable — removing either leaves the suite green. Removing **both** turns it red, so the *behaviour* is held. That is defence-in-depth on a cheap guard, not two unheld fixes, and the distinction is worth stating precisely: mutation-proving a line and mutation-proving a behaviour are different claims.

---

## Testing

- Tests **52 → 59**; suite **2788, 0 failures**, exit 0
- Bundle drift check: both `references/review-report-freshness.js` copies byte-match their `shared/` source
- `/develop-story` sections re-verified byte-identical to `origin/develop`
- Post-review table re-checked exhaustive over `fresh` / `stale` / `absent`
- The refute pass's exact defeating input now returns `{verdict: "stale", reportDate: "2020-01-01"}` — the report's real date

---

## A pattern worth recording

**Five string-replacement edits silently did nothing this cycle**, each because prettier had reformatted the target after it was written. Four were mutations that reported "STILL GREEN" — a *false* clean bill for a test that was never actually challenged. One silently dropped a test the author believed had been added.

In every case the tool output was accurate and the conclusion drawn from it was wrong. The mitigation now used throughout: assert the needle is present before replacing, and assert the test count changed after appending. `git check-ignore` supplied a sixth instance of the same shape — it reports negation rules too, so it names a rule for a file that is *not* ignored.

This matters beyond bookkeeping. A mutation that does not apply is indistinguishable, in its output, from a test that genuinely holds — and it fails toward *believing the test net is stronger than it is*, which is the same direction as every substantive defect in this task.

---

## Final Assessment

**Gate Status**: FAIL at review; all 8 findings closed in-cycle
**Quality Score**: 70/100 (gate reflects the state reviewed, not the state after fixes)
**Next**: cycle 3 verification, then Step 5c `/review-pr`

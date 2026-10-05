# QA Report: Task 171 - Deferred Work placement and qa-results engine residuals (cycle 5)

**Task**: [Link to task document](./task.171.deferred-work-placement-and-qa-results-residuals.md)
**Gate File**: [task.171.gate.5.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.5.deferred-work-placement-and-qa-results-residuals.yml)
**Previous Gate**: [task.171.gate.4.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.4.deferred-work-placement-and-qa-results-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Gate Status**: PASS

---

## Executive Summary

CR4-1 is resolved by the structural move: the setext check is fence-blind, like the H1/H2 check, so
no fence mis-pairing can hide a setext section from it. The review found no case where the engine
refuses a section it wrote, no false refusal of a qa-task or qa-story Step 12 render, and 0 false
refusals on the corpus. It found one HIGH — the setext paragraph test exempts some lines CommonMark
reads as paragraph text — which reproduces identically on `origin/develop` and has no corpus instance,
so it is pre-existing and routed to a follow-up.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Gate 4 finding | Status | Evidence |
| --- | --- | --- |
| CR4-1 stray fence closing on a plain opener deletes a setext section | FIXED (structural) | Q4 covers CR3-1 and three CR4-1 mis-pairings; F1, F2 red |
| CR4-2 (low) correct nesting over-refused | DISSOLVED | no fence is trusted, so none is distrusted wrongly; fenced YAML is refused by design (Q1) |

---

## New Findings This Cycle

- **[high, pre-existing]** `shared/resources/qa-results.js:283` — CR5-1: `RE_NOT_PARAGRAPH` exempts lines that are paragraph text (`#538 …`, an autolink, inline HTML, a three-backtick code span, an ordered item not starting at 1, an HTML type-7 line), so a setext section they head is deleted on replace → lean the setext check toward refusal; provenance below

### Provenance (CR5-1)

The six probe documents (`<HEAD>` over `-----`, then `keep-me-steps`, then the change log) were run
through the branch engine and through `git show origin/develop:shared/resources/qa-results.js`:

| Engine | `#538 …` | autolink | inline HTML | `Release` / `2026. Notes` | `Release` / `<b>2026</b>` | plain `Rollout Notes` |
| --- | --- | --- | --- | --- | --- | --- |
| origin/develop | replaced, lost | replaced, lost | replaced, lost | replaced, lost | replaced, lost | replaced, lost |
| branch | replaced, lost | replaced, lost | replaced, lost | replaced, lost | replaced, lost | **unbounded** (refused) |

A scan of every tracked `docs/**/*.md` QA section found 0 non-blank lines over an `=`/`-` underline.
Identical behaviour on base and 0 corpus hits ⇒ `pre-existing`: severity and confidence kept, not
entered in `top_issues[]`, routed to `recommendations.future` with a named follow-up. This branch
narrows the defect (it refuses the plain shape base deleted) and widens nothing.

---

## Testing Scope

### Review Methodology

Direct tools plus one independent reviewer. Re-review scope: files changed since gate 4 (head
a10c5662cd74; 8 files) — default. Reviewer dispatched 08:12:06 UTC, returned after 154693 ms
(completion notice `duration_ms`). `/qa-task` run from the procedure loaded in cycle 1.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| One home for the record, survives three writes | PASS | placement test |
| Every residual writes correctly or refuses with a `detail` | PASS | the setext residual is narrowed; CR5-1 is pre-existing |
| Both Step 12 halts print the detail | PASS | wiring test |
| create-bug-report checks the heading it writes | PASS | heading tests 3/3 |
| Engine, wiring and corpus tests < 2 s | PASS | |
| Corpus 0 / 0 / 0 | PASS | independent survey |
| ci:fast, bundle:check, validate | PASS with one environmental exception | cycle 4: `test-clean-checkout` whole-file budget, load-sensitive, untouched |

---

## Issues Found

**Total Issues**: HIGH: 0 open (1 pre-existing → future), MEDIUM: 0, LOW: 2 carried (future)

---

## NFR Assessment

- **Performance** — PASS
- **Reliability** — PASS (no deletion path this branch introduced remains open)
- **Security** — PASS; Evidence: reasoned; Probes executed: 0; `boundary: internal` (unchanged)
- **Maintainability** — PASS (narrowing residue ended with a structural move)

---

## Code Review

- [high/high, pre-existing] `shared/resources/qa-results.js:283` — CR5-1 → follow-up task

Promoted to gate `top_issues[]`: none (CR5-1 is pre-existing).

Platform variance: `TMPDIR=/tmp command node --test …` (5 files) → exit 0, 101/101.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: 5c PR conformance review; file the CR5-1 follow-up

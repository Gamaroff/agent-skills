# QA Report: Task 171 - Deferred Work placement and qa-results engine residuals (cycle 4)

**Task**: [Link to task document](./task.171.deferred-work-placement-and-qa-results-residuals.md)
**Gate File**: [task.171.gate.4.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.4.deferred-work-placement-and-qa-results-residuals.yml)
**Previous Gate**: [task.171.gate.3.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.3.deferred-work-placement-and-qa-results-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's fixes hold for the shapes they named. The per-range mis-pairing filter is beaten by a stray
fence that closes on a later plain opener, so a setext section behind it is again deleted on replace.
This is the third consecutive cycle on one mechanism — the setext check's fence exemption (CR2-2 added
it, CR3-1 narrowed it, CR4-1 beats the narrowing) — so the recommendation is a structural move, not a
fourth narrowing.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — resolve CR4-1

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| --- | --- | --- |
| CR3-1 stray info-string fence hides a setext section | FIXED for its shape | Q4; E1 red |
| CR3-2 (low) Step 5 condition wording | FIXED | heading test 1; E2 red |
| CR3-3 (low) population scan grammar | FIXED | data-dependent (no instance in the corpus) |

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-results.js:302` — CR4-1: the filter is per range; a stray fence that closes on a later plain opener hides the setext section in a range with no info-string line → treat mis-pairing per span, or stop exempting fenced lines on the replace side
- **[low]** `shared/resources/qa-results.js:308` — CR4-2: correct nesting (````markdown quoting ```yaml) is distrusted → over-refusal with a detail

---

## Testing Scope

### Review Methodology

Direct tools plus one independent reviewer. Re-review scope: files changed since gate 3 (head
170327697c0b; 9 files) — default. Reviewer dispatched 07:49:00 UTC, returned after 218062 ms
(completion notice `duration_ms`). `/qa-task` run from the procedure loaded in cycle 1.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (+2 carried lows)

---

## NFR Assessment

- **Performance** — PASS
- **Reliability** — CONCERNS (CR4-1 deletes behind a malformed fence pair)
- **Security** — PASS; Evidence: reasoned; Probes executed: 0; `boundary: internal` (unchanged)
- **Maintainability** — CONCERNS (narrowing residue on the setext fence exemption, three cycles)

---

## Code Review

- [medium/high] `shared/resources/qa-results.js:302` — CR4-1 → per-span distrust, or no replace-side exemption
- [low/medium] `shared/resources/qa-results.js:308` — CR4-2 → nesting-aware, or accept the over-refusal

Promoted to gate `top_issues[]`: CR4-1.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR4-1 resolved and re-reviewed
**Next Steps**: qa-fix cycle 4 — structural move on the fence exemption

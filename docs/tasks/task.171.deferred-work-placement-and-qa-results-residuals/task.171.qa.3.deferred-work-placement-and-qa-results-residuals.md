# QA Report: Task 171 - Deferred Work placement and qa-results engine residuals (cycle 3)

**Task**: [Link to task document](./task.171.deferred-work-placement-and-qa-results-residuals.md)
**Gate File**: [task.171.gate.3.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.3.deferred-work-placement-and-qa-results-residuals.yml)
**Previous Gate**: [task.171.gate.2.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.2.deferred-work-placement-and-qa-results-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fixes hold. The scoped review found that making the setext check fence-aware (CR2-2) reopened
the fence mis-pairing the structural guard is deliberately fence-blind to (task.155 REL-012/014): with
an unclosed info-string fence in the section, a real setext section after it is deleted on replace
rather than refused. Two lows on create-bug-report Step 5 wording and the population scan.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR3-1

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| CR2-1 H2 Bug Reports lists not recognised | FIXED | existing-forms list + population test; D4, D4b red |
| CR2-2 setext refuses fenced YAML | FIXED, but see CR3-1 | Q1; D1 red |
| CR2-3 (pre-existing) substring dedupe | FIXED | Q2; D2 red |
| CR2-4 (low) stale recommendations carried | NOT FIXED | advisory |
| CR2-5 (low) one stray CRLF | FIXED | Q3; D3 red |

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-results.js:321` — CR3-1: the fence-aware setext check trusts fence pairing, which an unclosed info-string fence breaks; a setext section after it is deleted on replace → exempt only inside a fence range with no interior opener-with-info-string line; add the mis-paired document as a must-refuse test
- **[low]** `skills/create-bug-report/SKILL.md:291` — CR3-2: the condition sentence still names only `###` before the existing-forms list → make the condition read the list
- **[low]** `tests/create-bug-report-bug-reports-heading.test.js:87` — CR3-3: the population scan is case-sensitive and plural-only → match the engine grammar

---

## Testing Scope

### Review Methodology

Direct tools plus one independent reviewer. Re-review scope: files changed since gate 2 (head
002094230330; 10 files) — default. Reviewer dispatched 07:34:40 UTC, returned after 293752 ms
(completion notice `duration_ms`). The reviewer reproduced each finding against the live engine and
against the gate-2 engine loaded with `git show 00209423`. `/qa-task` run from the procedure loaded in
cycle 1.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| One home for the record, survives three writes | PASS | placement test |
| Every residual writes correctly or refuses with a `detail` | CONCERNS | CR3-1 deletes behind a malformed fence |
| Both Step 12 halts print the detail | PASS | wiring test |
| create-bug-report checks the heading it writes | PASS | population test (CR3-2 wording low) |
| Engine, wiring and corpus tests < 2 s | PASS | 1.62 s |
| Corpus 0 / 0 / 0 | PASS | independent survey |
| ci:fast, bundle:check, validate | PASS | 5296 pass / 0 fail |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 (+2 carried lows)

---

## NFR Assessment

- **Performance** — PASS (1.62 s)
- **Reliability** — CONCERNS (CR3-1 is a deletion path, gated on a malformed fence)
- **Security** — PASS; Evidence: reasoned; Probes executed: 0; `boundary: internal` (unchanged)
- **Maintainability** — PASS

---

## Code Review

- [medium/high] `shared/resources/qa-results.js:321` — CR3-1 → exempt only well-paired fences
- [low/medium] `skills/create-bug-report/SKILL.md:291` — CR3-2 → condition reads the list
- [low/low] `tests/create-bug-report-bug-reports-heading.test.js:87` — CR3-3 → engine grammar

Promoted to gate `top_issues[]`: CR3-1.

Platform variance: `TMPDIR=/tmp command node --test …` (5 files) → exit 0, 100/100.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR3-1 fixed and re-reviewed
**Next Steps**: qa-fix cycle 3

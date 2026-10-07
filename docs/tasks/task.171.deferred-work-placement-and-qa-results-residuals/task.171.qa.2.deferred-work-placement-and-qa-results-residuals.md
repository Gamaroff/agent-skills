# QA Report: Task 171 - Deferred Work placement and qa-results engine residuals (cycle 2)

**Task**: [Link to task document](./task.171.deferred-work-placement-and-qa-results-residuals.md)
**Gate File**: [task.171.gate.2.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.2.deferred-work-placement-and-qa-results-residuals.yml)
**Previous Gate**: [task.171.gate.1.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.1.deferred-work-placement-and-qa-results-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: CONCERNS

---

## Executive Summary

Every cycle 1 finding is fixed and holds under the refute pass: repeated writes, line-ending switches
between writes, relocate-then-replace and the stranded case all converge with nothing lost. The refute
pass found two medium regressions this branch introduced — create-bug-report no longer recognises an
existing H2 Bug Reports list, and the setext rule refuses fenced YAML — plus one pre-existing substring
dedupe defect (routed to future) and two lows.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR2-1 and CR2-2

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 folded block lost on write 2 | FIXED | P1 (three shapes, stable after write 1); mutant C1 red |
| CR-2 sub-labelled bold list cut | FIXED | P2; mutant C2 red |
| CR-3 non-ISO log rows deleted on relocate | FIXED | P3 (two row shapes refused); mutant C3 red |
| CR-4 CRLF separator + comment deleted | FIXED | P4 (CRLF output == LF output converted); mutant C4 red |
| CR-5 survey measured with the engine | FIXED | independent `allowance()` + its unit test; mutants C5, C5b red |
| CR-6 (low) legacy comment deleted | FIXED | O6; mutant C6 red |
| CR-7 (low) setext false refusals | NOT FIXED | advisory, carried in gate 2 `recommendations.future` |

---

## New Findings This Cycle

- **[medium]** `skills/create-bug-report/SKILL.md:291` — CR2-1: the check no longer counts an H2 `## Bug Reports` list (11 tracked tasks carry one), so the next filing opens a second `###` list → count levels 2–4 and the bold form as existing; add an H2 case to the heading test
- **[medium]** `shared/resources/qa-results.js:304` — CR2-2: setext detection is fence-blind, so fenced YAML is refused → check setext only outside fences; add the case
- **[medium, pre-existing]** `shared/resources/qa-results.js:263` — CR2-3: the fold's substring dedupe deletes a later block whose body is a substring of an earlier one → provenance below; routed to `recommendations.future`
- **[low]** `shared/resources/qa-results.js:196` — CR2-4: a bold Bug Reports block carries QA's own `**Recommendations**:` list
- **[low]** `shared/resources/qa-results.js:635` — CR2-5: one stray CRLF makes the whole section CRLF

---

## Testing Scope

### Review Methodology

Direct tools plus one independent refute-pass reviewer (cycle 2 = exactly one prior gate → whole-branch
diff, REFUTE directive appended). Reviewer dispatched 07:17:25 UTC, returned after 334839 ms
(completion notice `duration_ms`). `/qa-task` was run from the procedure loaded in cycle 1 rather than
re-invoked; every step below ran.

Re-review scope: unscoped (cycle 2 refute pass — whole `origin/develop...HEAD` diff, 13 files).

Step 4b: the changed runnable-prose files are the same as cycle 1 plus none new; the Step 12 halts are
still executed by `tests/qa-results-step12-wiring.test.js` (10/10).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Deferred Work has one home | PASS | Verified | placement test 4/4 |
| Phase 2: engine residuals | CONCERNS | Partial | CR2-2 setext in fences |
| Phase 3: create-bug-report heading check | CONCERNS | Partial | CR2-1 H2 lists no longer recognised |
| Phase 4: docs and validation | PASS | Verified | CHANGELOG, task, plan amended for cycle 1 |

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| One home for the record, survives three writes | Yes | Yes | PASS |
| Every residual writes correctly or refuses with a `detail` | All | Yes, except fenced YAML now false-refused (CR2-2) | CONCERNS |
| Both Step 12 halts print the detail | Yes | Yes | PASS |
| create-bug-report checks the heading it writes | Yes | Yes, but an existing H2 list is missed (CR2-1) | CONCERNS |
| Engine, wiring and corpus tests < 2 s | < 2 s | 1.62 s | PASS |
| Corpus 0 / 0 / 0 (independent instrument) | 0 / 0 / 0 | 0 / 0 / 0 | PASS |
| Every new assertion mutation-proved | Yes | Cycle 1 fixes: 7/7 red | PASS |
| ci:fast, bundle:check, validate | Clean | 5292 pass / 0 fail; 0 problems; ✓ | PASS |

---

## Breaking Changes Validation

Unchanged from cycle 1 — PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2 open, 1 pre-existing)

Code-review findings promoted under `code_review_blocking` (CR2-1, CR2-2); detail in the gate.
CR2-3 provenance: the same document run through the `origin/develop` engine (`git show
origin/develop:shared/resources/qa-results.js`) returns `replaced` with the `- REL-1` block lost —
identical to the branch; the engine-independent corpus survey reports 0 deletions → `pre-existing`,
severity and confidence unchanged, routed to `recommendations.future`.

### LOW Severity Issues (2 new, 1 carried)

CR2-4, CR2-5, and gate 1's CR-7.

**Total Issues**: HIGH: 0, MEDIUM: 2 (+1 pre-existing), LOW: 3

---

## NFR Assessment

### Performance — PASS

1.62 s combined.

### Reliability — PASS

The refute pass converged every lifecycle it tried. The open findings refuse (CR2-2) or duplicate a
list (CR2-1); neither deletes.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — unchanged from cycle 1 (no corpus sink models a work-item section writer).

### Maintainability — PASS

---

## Code Review

**Correctness bugs (5):**

- [medium/high] `skills/create-bug-report/SKILL.md:291` — CR2-1 → count H2–H4 and bold as existing
- [medium/high] `shared/resources/qa-results.js:304` — CR2-2 → setext only outside fences
- [medium/high, pre-existing] `shared/resources/qa-results.js:263` — CR2-3 → compare whole bodies
- [low/high] `shared/resources/qa-results.js:196` — CR2-4 → do not continue past QA template labels
- [low/high] `shared/resources/qa-results.js:635` — CR2-5 → majority line ending

**Cleanups (0)**

Promoted to gate `top_issues[]`: CR2-1, CR2-2.

mutation-proven: always fold → P1 → covered
mutation-proven: sub-label exception off → P2 → covered
mutation-proven: ISO-only rows → P3 → covered
mutation-proven: `\r` kept on k-1 → P4 → covered (after P4 was tightened)
mutation-proven: comment never peeled → M4, O6, P4, survey → covered
mutation-proven: allowance permits carried lines → allowance test → covered
mutation-proven: allowance keeps separators → allowance test → covered

Platform variance: `TMPDIR=/tmp command node --test …` (5 files) → exit 0, 96/96.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` (cycle 1 fix head) | PASS — 5292 pass, 0 fail |
| Engine A–P, placement, heading, wiring, corpus | PASS — 96/96 |

---

## Recommendations

### Immediate Actions (Blocking)

1. CR2-1, CR2-2 — qa-fix cycle 2.

### Short-term Actions (Non-Blocking)

1. CR2-3 (pre-existing) — compare whole bodies in the fold dedupe.
2. CR2-4, CR2-5, CR-7 — lows.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 1 is fixed and convergent; two medium regressions remain, neither deleting content.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR2-1 and CR2-2 fixed and re-reviewed

---

**QA Report**: co-located at `task.171.qa.2.deferred-work-placement-and-qa-results-residuals.md`
**Gate File**: co-located at `task.171.gate.2.deferred-work-placement-and-qa-results-residuals.yml`
**Next Steps**: qa-fix cycle 2

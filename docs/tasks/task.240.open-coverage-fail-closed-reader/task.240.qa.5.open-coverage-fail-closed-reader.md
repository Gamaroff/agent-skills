# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check (cycle 5)

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.5.open-coverage-fail-closed-reader.yml](./task.240.gate.5.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4's escape refusal holds. The scoped review found one more disagreement with YAML. The entry
parser assumes an entry's later keys sit two columns after the dash. When the dash is followed by
more than one space, a block YAML rejects reads as a confident 0, where the base awk refused it
(BUG-5).

This is the fifth cycle in a row in which a single hand-picked shape broke the reader. Gate 5 keeps
the recommendation to compare the reader against a YAML parser (CR-6).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-240-QA-6)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| BUG-1, BUG-2, BUG-3 | ✅ FIXED | Fixtures re-run: each reads as designed |
| TASK-240-QA-5 / BUG-4 | ✅ FIXED | All four shapes read `unreadable`. M16 and M17 were proven by qa-fix |

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:342`: the parser places an entry's later keys at the dash plus two columns, regardless of how many spaces follow the dash. A block YAML rejects therefore reads 0 (TASK-240-QA-6, [bug.5](./task.240.bug.5.wide-dash-spacing-misplaces-keys.md)).
- **[low]** `shared/resources/open-coverage.js:24`: the header's description of escapes is out of date since cycle 4 (TASK-240-QA-7).

---

## Testing Scope

### Review Methodology

The review used direct tools plus one read-only Explore code reviewer.

- **Reviewer pass:** narrowed to the files changed since gate 4's head (`32065fbf`), diffed against `origin/develop`. The whole of `open-coverage.js` is new, so all of it was in scope.
- **Reviewer timing:** dispatched at 15:24:41Z; returned in 178,030 ms (completion notice `duration_ms`).
- **Cross-check:** each finding was reproduced three ways: with the reader, with the old awk block, and with PyYAML 6.0.3.

**Re-review scope:** narrowed to the files changed since `32065fbf`: `CHANGELOG.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, `shared/resources/open-coverage.js` and `shared/resources/tests/open-coverage.test.mjs`.

**Step 4b:** unchanged; no fenced block changed.

CI on 0c11216fa157: pending

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 counts read right | BUG-5: a block YAML rejects reads a false 0 | CONCERNS |
| SC-2 parity | 94/94 locally; CI pending on `0c11216f` | PASS (local) |
| SC-4 corpus | 187 reports, 0 changes | PASS |
| SC-6 `ci:fast` | 6,639 pass, 0 fail (cycle 4 fix) | PASS |
| SC-7 / SC-8 | `bundle:check` 0; `validate` ×3 0 | PASS |
| SC-9 | M16 and M17 (cycle 4) | PASS |
| SC-3, SC-5, SC-10, SC-11 | unchanged | PASS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: wide spacing after a dash misplaces an entry's keys**

- **Bug report**: [task.240.bug.5.wide-dash-spacing-misplaces-keys.md](./task.240.bug.5.wide-dash-spacing-misplaces-keys.md)
- **Provenance**: new on this branch; the base awk refused this block.
- **Severity**: medium, on a measurement. None of the 187 tracked reports puts two or more spaces after a list dash, and review-pr writes `- id:`.

### LOW Severity Issues (1)

- TASK-240-QA-7: the header text on escapes is out of date.

**Total issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

| NFR | Status | Notes |
| --- | --- | --- |
| Security | PASS | boundary: internal; evidence: reasoned; 0 probes |
| Performance | PASS | one linear pass |
| Reliability | CONCERNS | BUG-5 |
| Maintainability | PASS | header drift only |

---

## Code Review

`finding-anchors.js --rev HEAD`: both anchors resolve.

- [medium/high] `shared/resources/open-coverage.js:342`: wide spacing after a dash produces a false 0. **Promoted** as TASK-240-QA-6.
- [low/high] `shared/resources/open-coverage.js:24`: the header has drifted from the code. **Promoted** as TASK-240-QA-7.

**Mutation proofs**: none this cycle. qa-fix proved M16 and M17 in cycle 4.

---

## Final Assessment

**Gate status**: CONCERNS
**Quality score**: 90/100
**Deployment recommendation**: CONDITIONAL, on TASK-240-QA-6 being fixed.

**Next steps**: run `/qa-fix` cycle 5, the last in the budget. The loop-limit trigger decides what
follows.

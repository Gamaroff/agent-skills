# QA Report: Task 266 - create-task asks the questions its checks miss

**Task**: [Link to task document](./task.266.create-task-asks-the-questions-its-checks-miss.md)
**Gate File**: [task.266.gate.1.create-task-asks-the-questions-its-checks-miss.yml](./task.266.gate.1.create-task-asks-the-questions-its-checks-miss.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

The change adds four Critical items and one Should Add item to `create-task` § 3.5, and a run-count clause to the finalise AC prompt, with three bundled copies regenerated. It is prose only. The tests pass and the behavioural evidence holds. One MEDIUM finding: no CHANGELOG entry citing task 266.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (add the CHANGELOG entry)

---

## Testing Scope

### Review Methodology

Direct tools, single pass (first review, prose-only change). Adaptive strategy override: lite mode not set; small task, direct tools.

Step 3b diff code review: not applicable, the diff has no reviewable code (two Markdown files, three generated copies, task documents). Step 4b: the diff adds no fenced bash block (`changed.total` 0 of 6 blocks in `skills/create-task/SKILL.md`, all six refused as mutating or unresolved helpers, none touched).

CI on d93ca1035f6d: green (CI_SUMMARY from `qa-ci-read.sh`).

Re-review scope: not applicable, first review.

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. The five items in § 3.5 | PASS | Verified | Four Critical items (obs #122, #134, #154, #156) and one Should Add (obs #31) present in `skills/create-task/SKILL.md` |
| 2. Finalise run-count clause | PASS | Verified | `shared/resources/finalise-dod-ac-prompt.md:72`; three copies match |
| 3. Evidence and checks | PASS | Verified | Eleven-draft table below |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Five items present and firing on their motivating shape | 5 | 5; D1, D3, D5, D6, D8, D10 flagged by the new item or a clean discriminator (D8, D10 unflagged at baseline) | PASS |
| Each item leaves its control unflagged | 5 controls | D2, D4, D7, D9, D11 unflagged after the change | PASS |
| Finalise prompt names run count and statistic | present | `finalise-dod-ac-prompt.md:72`: "median of at least five runs" | PASS |
| `npm test` wall time within 10% of develop (median of five alternating) | within 10% | Not measured as written. One run: 491 s at load avg ~12 | UNVERIFIED |
| Contract tests pass | 50/50 | 50/50 (`CI=true node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/review-task-measured-criterion.test.js`) | PASS |
| `bundle --check` | 0 problems | 0 problems (129 skills) | PASS |
| `quick_validate.py skills/create-task` | passes | passes | PASS |
| No item restates a section list | none | none | PASS |

Behavioural evidence (the eleven drafts, new versus `develop` baseline, fresh agents, one run per arm, drafts written by the implementer):

| Draft | Item | New § 3.5 | Baseline |
| --- | --- | --- | --- |
| D1 single-run timing | #31 | flagged by #31 | flagged by an unrelated item |
| D2 median of 5, load ceiling | #31 control | not flagged | not flagged |
| D3 rule from one example | #122 | flagged by #122 | flagged by an unrelated item |
| D4 measured population | #122 control | not flagged | flagged by an unrelated item |
| D5 detect/configure parse vs raw text | #134 | flagged by #134 | not for the disagreement itself |
| D6 detect/configure encoding disagreement | #134 | flagged by #134 | same as D5 |
| D7 one reading, mapped refusals | #134 control | not flagged | flagged for uncited assertions only |
| D8 two layers, tests via first | #154 | flagged by #154 | not flagged |
| D9 second-layer-alone test + mutation | #154 control | not flagged | not flagged |
| D10 seeded remedy, no test grep | #156 | flagged by #156 | not flagged |
| D11 seeded remedy, grepped | #156 control | not flagged | not flagged |

---

## Breaking Changes Validation

None. Prose only.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: No CHANGELOG entry citing task 266**
- **Severity**: MEDIUM
- **Observation**: `changelog-cites.sh task.266` answers `missing (task 266)`.
- **Impact**: `/finalise` 6d HALTs without it.
- **Recommendation**: Add an `[Unreleased]` entry citing `(task 266)`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — CONCERNS
The wall-time criterion could not be measured as written. The full suite took 491 s (7944 pass, 0 fail, 2 skipped) at a load average near 12, which is not a valid timing, and ten runs are not practical here. The change adds about 3 KB of prose to two files that 50 contract tests read (2.7 s). Recorded as a future action: measure on the quiet LAN server, or reword the criterion.

### Reliability — PASS
Bundled copies match their source.

### Security — PASS
Evidence: reasoned. Probes executed: 0. Prose only, `boundary: false`, no predicate-shaped function added.

### Maintainability — PASS
`CARD_SECTIONS_BY_KIND` remains the single definition.

---

## Code Review

Not applicable: no reviewable code in the diff. No correctness bugs, no cleanups.

---

## Regression Testing

`CI=true npm test`: 7944 pass, 0 fail, 2 skipped, exit 0. tmp-leak ratchet ok.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/review-task-measured-criterion.test.js
npm run bundle -- --check
python3 skills/create-skill/scripts/quick_validate.py skills/create-task
npm run validate -- skills/create-task/
CI=true npm test
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Add the CHANGELOG `[Unreleased]` entry citing `(task 266)`.

### Short-term Actions (Non-Blocking)
1. Measure the wall-time criterion on a quiet host, or reword it.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Correct, tested prose change; one MEDIUM (CHANGELOG) and one criterion not measurable as written.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL (CHANGELOG entry)

**QA Report**: co-located at `task.266.qa.1.create-task-asks-the-questions-its-checks-miss.md`
**Gate File**: co-located at `task.266.gate.1.create-task-asks-the-questions-its-checks-miss.yml`

# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Task**: [Link to task document](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.6.qa-reentry-after-finalise-gaps.yml](./task.170.gate.6.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: PASS

---

## Re-Review Context

Cycle 6 — the first of two cycles granted on resume after the loop-limit halt (`qa_max_cycles` 7).

| Previous issue (gate 5) | Status |
| --- | --- |
| CR-1 (medium) — `report_entries` was the raw heading count, so the resume's back-fill cleared the precedence early | **FIXED** — recorded as `max(highest gate, headings)`; the "behind" case expects 2; reverting reds it (bug 5 closed) |
| CR-2 (advisory) — in-flight-gate parenthetical was false | **PARTIAL** — reworded; still false in the report-ahead case (new CR-1 below) |

## New Findings This Cycle

- **[low]** `shared/resources/develop-pipeline-resume-contract.md:451` — with the report ahead of the gates, the in-flight-gate sentence is false: no back-fill happens, the precedence holds, and the resume re-runs the cycle over the same head → scope the sentence, or key clearing on the highest gate at re-entry. (CR-1)

---

## Executive Summary

Scoped re-review of the cycle-5 fix (files changed since gate 5's head `9915dd93`). The fix closes gate 5's CR-1. One low finding: a contract sentence is false in the report-ahead case, and it fails safe there (one extra cycle). Suite, parity and fast gate all green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#563, OPEN, head `d0617e34`)

### Review Methodology

Direct tools plus one read-only Explore code reviewer (dispatched 20:44 UTC; `duration_ms` 85675).
Traceability matrix reused from cycle 1 (`.summaries/qa-traceability-matrix.md`); no new success criteria since.

Re-review scope: files changed since gate 5 (head 9915dd9376a7; 22 files) — default

Step 4b: ran `qa-execute-snippets.mjs` over `develop-pipeline-resume-contract.md` (2 runnable, 8 placeholder, 21 mutating; 0 findings) and `develop-pipeline-pause.md` (no fenced bash).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: re-entry script | PASS | 52/52 | `report_entries` = back-filled count |
| Phase 2: contract + step docs | PASS | parity 11/11 | precedence wording updated; CR-1 low |
| Phase 3: guards | PASS | fast gate green | — |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Re-entry suite | all pass | 52/52 | PASS |
| Parity tests (lock fields, refusal routes) | all pass | 11/11 | PASS |
| `npm run ci:fast` | green | 5264 pass, 0 fail (symlink aside) | PASS |
| `bundle:check` | 0 problems | 0 problems | PASS |
| `quick_validate` (develop-task, develop-story, finalise) | valid | valid | PASS |

---

## Breaking Changes Validation

None — the lock field `qa_reentry.report_entries` changes value semantics only; it has one writer and is read only by the precedence.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

**CR-1** — report-ahead case: the in-flight-gate sentence is false; the resume re-runs one cycle over the same head. Reviewer rated medium/medium. QA traced it and calibrates **low**: it can only cost one extra QA cycle, never a Step 7 over an ungated head, and report-ahead is the anomaly the reconstruction already warns about.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
CR-1 fails safe. The back-filled count closes gate 5's CR-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The delta changes only the recorded `report_entries` value. The refusal predicate (`boundary: true`) is unchanged since cycle 1, where hostile heads were executed by hand. The engine's `filename` corpus does not fit this script's contract.

### Maintainability — PASS
CR-3 (cleanup) is a stale test comment.

---

## Code Review

Reviewer reviewed 4 `shared/resources/` sources (bundled copies excluded).

**Correctness bugs (2):**
- [medium/medium → low, QA-calibrated] `shared/resources/develop-pipeline-resume-contract.md:451` — report-ahead in-flight gate is not back-filled → precedence holds → extra cycle. **Entered in gate as CR-1 (low).**
- [medium/low] `shared/resources/reenter-qa-after-finalise.sh:214` — `report_entries` matches the back-fill only for contiguous numbering. QA traced it: the back-filled last entry reads PR Review "not reached", so no Step 7 follows. Advisory (CR-2).

**Cleanups (1):**
- `shared/resources/reenter-qa-after-finalise.test.sh:234` — stale comment ("record the headings as written") contradicts the behind case. (CR-3)

mutation-proven: `report_entries` ← raw heading count (`$DONE`) → "report_entries behind" went red (51/52) → covered

---

## Regression Testing

Fast gate (format check + full `npm test`) green with the `.agents/skills` symlink moved aside: 5264 pass, 0 fail.

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
command node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs evals/shared/tests/reenter-qa-refusals-parity.test.mjs
npm run bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/{develop-task,develop-story,finalise}/
npm run ci:fast   # .agents/skills moved aside
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Gate 5's finding is fixed and mutation-proven. The one remaining finding is low and fails safe.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

**Next Steps**: the loop's route classifier decides between 5b and 5c (the open entry is low only).

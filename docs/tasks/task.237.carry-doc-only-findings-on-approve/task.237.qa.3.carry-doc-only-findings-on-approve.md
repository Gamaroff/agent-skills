# QA Report: Task 237 - Apply 5c doc-only findings on APPROVE (cycle 3)

**Task**: [Link to task document](./task.237.carry-doc-only-findings-on-approve.md)
**Gate File**: [task.237.gate.3.carry-doc-only-findings-on-approve.yml](./task.237.gate.3.carry-doc-only-findings-on-approve.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| QA-2 / TASK-237-BUG-2: `CARRY_FIXED` negative guard not scoped to the sentence | ✅ FIXED | Re-run against `7d5acc24`: M7, M8 and M10 red at test 14, and M9 green. Bug closed. |
| QA-3: empty-`CARRY_FIXED` sentence keyed on the classify input | ✅ FIXED | The sentence now reads "cleared no path, or no fix changed a cleared path". Reverting it (M11) turns test 14 red. |

## Executive Summary

Both cycle-2 findings are fixed. The guard now judges the clause that decides an empty
`CARRY_FIXED`, not a span scanned from one verdict token. It catches every revert shape found so
far and no longer false-flags a correct sentence. The scoped review found one low-confidence
advisory, recorded as future.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools, with one read-only Explore reviewer. The reviewer returned in 75.9 s. Mutations ran
after it returned.

Re-review scope: files changed since gate 2's head `0b32332776aa` (9 files: the test, the shared
QA-loop doc and its 2 bundled copies, and 5 task artifacts).

`SAFETY_REPROBE=false`. Clause 1 is false (security PASS on gate 2). Clauses 2 and 3 do not apply.

Step 4b: no changed fenced block in the shared QA-loop doc (`qa-execute-snippets` changed total 0).
The edit is one prose sentence.

---

## New Findings This Cycle

- **[low/low, advisory]** `evals/shared/tests/pr-review-loop-parity.test.mjs:821`: the verdict check
  is case-sensitive while the clause filter is not → `recommendations.future`, not taken. Lowercase
  "approve" and "concerns" are ordinary prose, and this document writes every verdict as a
  backticked uppercase token.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1 both rows carry the clause | test 13; M1 red (cycle 2) | PASS |
| SC2 carry prose names no verdict | M5, M7, M8, M10 and M11 red; M9 green; non-vacuity floor (M12 red in cycle 2) | PASS |
| SC3 restatements | unchanged since cycle 1; the arrow form stays in future | PASS |
| SC4 code and path-less findings not fixed | the classify and stage blocks are unchanged; carries-5c 24/24 | PASS |
| Perf / quality: suites, bundle | parity 33/33, carries-5c 24/24, `bundle:check` 128 skills, 0 problems; `quick_validate` develop-task and develop-story ok; fast gate 6433, 0 failed | PASS |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (1 advisory in future)

---

## NFR Assessment

### Performance — PASS
The clause split runs over one section, and the suite stays under a second.

### Reliability — PASS
The blocks are unchanged.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`.

### Maintainability — PASS
The guard reads the section through `sectionBetween` (both markers asserted) and fails when no
deciding clause exists.

---

## Code Review

This finding is advisory: it is `bug` with `confidence: low`, so the promotion rule does not apply.
Anchor check: `ok`.

**Correctness bugs (1):**
- [low/low] `evals/shared/tests/pr-review-loop-parity.test.mjs:821`: a lowercase revert ("on an approve, leave `CARRY_FIXED` empty") passes the verdict check → make it case-insensitive. Not taken; see New Findings.

**Cleanups (0).**

**Mutation proofs** (`cp` snapshot and restore, tree identical afterwards):

- mutation-proven: CONCERNS-keyed sentence added beside the kept one (M7) → test 14 → covered
- mutation-proven: APPROVE key after "e.g." added beside it (M8) → test 14 → covered
- mutation-proven: "Leave `CARRY_FIXED` empty on `APPROVE`." added (M10) → test 14 → covered
- mutation-proven: APPROVE clause before the correct sentence (M9) → no test red → correct (the false positive is gone)
- mutation-proven: QA-3 wording reverted (M11) → test 14 → covered
- mutation-proven: "On `APPROVE` (as task.179 did)" (M5) → test 14 → covered

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Widen the restatement population to the arrow form (`autonomous-defaults.md:34`).
2. Consider a case-insensitive verdict check if a lowercase revert ever appears.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: both findings are fixed and mutation-proven. No open issue.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.237.qa.3.carry-doc-only-findings-on-approve.md`
**Gate File**: co-located at `task.237.gate.3.carry-doc-only-findings-on-approve.yml`
**Next Steps**: Step 5c, `/review-pr`.

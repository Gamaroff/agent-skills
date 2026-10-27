# QA Report: Task 237 - Apply 5c doc-only findings on APPROVE (cycle 2)

**Task**: [Link to task document](./task.237.carry-doc-only-findings-on-approve.md)
**Gate File**: [task.237.gate.2.carry-doc-only-findings-on-approve.yml](./task.237.gate.2.carry-doc-only-findings-on-approve.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| QA-1 / TASK-237-BUG-1: classify-keyed `CARRY_FIXED` sentence unpinned | ✅ FIXED | M4 (sentence deleted) and M5 (APPROVE key behind `task.179`) re-run against `0b323327`; both red at test 14. Bug closed. |

## Executive Summary

Cycle 1's fix holds: the classify-keyed sentence is pinned, and both reverts it named now fail.
The cycle-2 refute pass found that the negative half of the same test does not judge the sentence
that decides. It misses a CONCERNS-keyed sentence and an APPROVE key after "e.g.", and it
false-flags a correct sentence that follows an APPROVE clause. All three were confirmed by
mutation. It also found that the empty-`CARRY_FIXED` sentence keys on the classify input, not on
the edit set.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-2 fixed)

---

## Testing Scope

### Review Methodology

Direct tools, with one read-only Explore reviewer. Cycle 2 is always a full refute pass over the
whole branch diff (1483 lines), with the REFUTE PASS directive appended. The reviewer was
dispatched at 16:14:40Z and returned in 229.0 s (`duration_ms` 229024). Mutations ran after it
returned.

Re-review scope: unscoped — cycle 2 refute pass (whole `origin/develop...HEAD` diff; prior gate 1 head `928fc7899b7d`)

`SAFETY_REPROBE=false`. Clause 1 is false (security PASS on gate 1). Clauses 2 and 3 do not apply:
no safety axis failed, and no success criterion is safety-shaped.

Step 4b: no change to runnable prose since cycle 1. The cycle-1 fix touched only a test file. The
cycle-1 Step 4b record stands.

---

## New Findings This Cycle

- **[medium]** `evals/shared/tests/pr-review-loop-parity.test.mjs:810`: the negative guard is not
  scoped to the sentence it judges. M7 and M8 stay green, and M9 is red (false positive) → QA-2,
  [TASK-237-BUG-2](./task.237.bug.2.carry-fixed-negative-guard-sentence-scope.md).
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1606`: the empty-`CARRY_FIXED`
  sentence keys on "cleared no path", but the block defines `CARRY_FIXED` as the paths that were
  changed → QA-3.
- **[low, advisory]** `shared/resources/develop-pipeline-autonomous-defaults.md:34`: an arrow-form
  verdict restatement the population grep did not search → `recommendations.future`.
- **[cleanup]** `evals/shared/tests/pr-review-loop-parity.test.mjs:795`: a hand slice instead of
  `sectionBetween`. Folded into QA-2's action.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1 both rows carry the clause | test 13; M1 red (cycle 1) | PASS |
| SC2 carry prose names no verdict | "Classify on" half: M2 red. `CARRY_FIXED` positive pin: M4 red, M5 red. Negative half: M7 and M8 green (missed), M9 red (false positive) | CONCERNS (QA-2) |
| SC3 restatements | unchanged since cycle 1; verified by reading | PASS |
| SC4 code and path-less findings not fixed | the Carry prose is unchanged; carries-5c 24/24 | PASS |
| Perf / quality: suites, bundle | parity 33/33, carries-5c 24/24, `bundle:check` 128 skills, 0 problems | PASS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: the `CARRY_FIXED` negative guard is not scoped to the sentence (QA-2)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.237.bug.2.carry-fixed-negative-guard-sentence-scope.md](./task.237.bug.2.carry-fixed-negative-guard-sentence-scope.md)
- **Observation**: M7, M8 and M9, as listed under Code Review.
- **Recommendation**: split the Carry section into sentences, and assert that no sentence holding
  "leave `CARRY_FIXED` empty" names a verdict.
- **Priority**: P2

This finding enters `top_issues[]` under Step 5's rule, as QA-1 did. SC2's committed test holds the
claim for one verdict only. The reviewer's confidence is medium, so Step 3b's promotion rule alone
would not have promoted it.

### LOW Severity Issues (1)

**QA-3**: the empty-`CARRY_FIXED` sentence keys on the classify input rather than on the edit set.
On `APPROVE` a cleared path can be left unedited, and the prose does not cover that case.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
The negative regex is linear: 1k, 10k, 100k and 400k characters take 1, 1, 4 and 16 ms.

### Reliability — PASS
The blocks are unchanged.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The cycle-1 fix adds no shipped predicate; the regex is in a test.

### Maintainability — CONCERNS
QA-2.

---

## Code Review

These findings are advisory under the promotion rule, because none is `bug` + `confidence: high`.
QA-2 and QA-3 enter the gate under Step 5's rule and QA's severity judgement.

**Correctness bugs (3):**
- [medium/medium] `evals/shared/tests/pr-review-loop-parity.test.mjs:810`: the negative guard misses a CONCERNS-keyed sentence, a reversed word order and an APPROVE key after "e.g.", and it false-flags a correct sentence after an APPROVE clause → judge the sentence that holds "leave `CARRY_FIXED` empty". **Confirmed: M7 and M8 green, M9 red.**
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1606`: the empty case is keyed on the classify input, not on the edit set → key it on the edit set. QA re-rated this to LOW (QA-3), because the block's inline definition ("write `CARRY_FIXED=()` when none") already gives the right answer. The reviewer's scenario requires an orchestrator to add an unedited path against that definition. The reviewer's original severity was medium.
- [low/medium] `shared/resources/develop-pipeline-autonomous-defaults.md:34`: an arrow-form restatement missing from the population → `recommendations.future`. It states no fix rule, so SC3 still holds.

**Cleanups (1):**
- `evals/shared/tests/pr-review-loop-parity.test.mjs:795`: the hand slice widens silently, unlike `sectionBetween` → use `sectionBetween`. Folded into QA-2.

**Mutation proofs** (`cp` snapshot and restore, tree identical afterwards):

- mutation-proven: classify-keyed sentence deleted (M4) → test 14 → covered
- mutation-proven: "On `APPROVE` (as task.179 did), leave `CARRY_FIXED` empty" (M5) → test 14 → covered
- mutation-proven: CONCERNS-keyed sentence added beside the kept one (M7) → no test red → no-red-untested (QA-2)
- mutation-proven: APPROVE key after "e.g." added beside it (M8) → no test red → no-red-untested (QA-2)
- mutation-proven: APPROVE clause before the correct sentence (M9) → test 14 red on a correct document → wrong-test-red, a false positive (QA-2)

Two of the five were covered. The other three are QA-2.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-2: scope the negative guard to the sentence.

### Short-term Actions (Non-Blocking)
1. QA-3: key the empty-`CARRY_FIXED` sentence on the edit set.
2. Widen the restatement population to the arrow form (`autonomous-defaults.md:34`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the rule change and the cycle-1 fix hold. The negative half of the guard does not
judge the sentence it is about.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-2 fixed

---

**QA Report**: co-located at `task.237.qa.2.carry-doc-only-findings-on-approve.md`
**Gate File**: co-located at `task.237.gate.2.carry-doc-only-findings-on-approve.yml`
**Next Steps**: `/qa-fix` for QA-2 and QA-3, then re-review in cycle 3.

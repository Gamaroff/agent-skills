# QA Report: Task 245 - Shared-checkout-safe guards and staging

**Task**: [Link to task document](./task.245.shared-checkout-safe-guards-and-staging.md)
**Gate File**: [task.245.gate.4.shared-checkout-safe-guards-and-staging.yml](./task.245.gate.4.shared-checkout-safe-guards-and-staging.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS

---

## Executive Summary

T245-QA-4 is fixed. The scoped review found one new medium defect in the same sentence: the stageReason gate and the closing tick sentence disagree for the `not-attempted` exits. The cycle-3 fast gate (6910 tests, 0 fail) covers the reviewed head.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T245-QA-4 unconditional tick overrides the stageReason gate | FIXED | The closing sentence no longer ticks every arm; the shape test fails on the old sentence (mutation-proven in cycle 3). The rewording introduced the `not-attempted` ambiguity below. |

Re-review scope: files changed since gate 3 (head 2d44d5639530; 2 non-document files) — default.

---

## New Findings This Cycle

- **[medium/medium]** `skills/develop-batch/SKILL.md:661` — the stageReason gate (line 648) applies to every reason other than staged / already-staged, including `not-attempted`, which the lane logs with no commit and used to tick → scope the gate to `annotated` / `already` and name the arms that tick. Reviewer CR-1; verified against `shared/resources/registry-tick.js` lines 167 and 348-351. Gate id T245-QA-5.
- **[low/medium]** `evals/develop-batch/protocol/skill-shape.test.mjs:445` — CR-2: the negative assertion rejects only the exact old string → positive assertions on the scoped gate and the closing sentence, folded into T245-QA-5.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer over the scoped patch (2 files). Reviewer time not measured. Step 4b: not applicable — no fenced block changed in this scope.

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `skills/develop-batch/SKILL.md:661` — tick rule ambiguous for `not-attempted` → T245-QA-5.

**Cleanups (1):**
- `evals/develop-batch/protocol/skill-shape.test.mjs:445` — string-only negative assertion → folded into T245-QA-5.

boundary: false. The change set adds prose and prose-shape assertions, no accept/reject predicate.

---

## NFR Assessment

### Performance — PASS
No new cost.

### Reliability — CONCERNS
T245-QA-5.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- No input-accepting boundary is delivered.

### Maintainability — PASS
Copies held by test E and bundle:check.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding in prose that decides whether a registry row is ticked.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T245-QA-5 fixed

---

**QA Report**: co-located at `task.245.qa.4.shared-checkout-safe-guards-and-staging.md`
**Gate File**: co-located at `task.245.gate.4.shared-checkout-safe-guards-and-staging.yml`
**Next Steps**: fix applied in the same pass; cycle 5 re-reviews it.

# QA Report: Task 245 - Shared-checkout-safe guards and staging

**Task**: [Link to task document](./task.245.shared-checkout-safe-guards-and-staging.md)
**Gate File**: [task.245.gate.3.shared-checkout-safe-guards-and-staging.yml](./task.245.gate.3.shared-checkout-safe-guards-and-staging.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's two findings are fixed and held by tests. The scoped review found one new medium defect: a closing sentence in the develop-batch merge lane contradicts the new stageReason gate. Tests were green at the cycle-2 gate run (6910 tests, 0 fail) and the cycle-2 fix commit changed no code since.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T245-QA-2 second `git status -z` unchecked | FIXED | The block captures once to a temp file and HALTs on failure or empty output; test M8 (git shim exiting 3) HALTs; with the old block restored M8 and test E went red. |
| T245-QA-3 develop-batch ignores stageReason | PARTIAL | The gate sentence exists and is asserted, but line 661 still says "Mark `ticked: true` on every arm" (see T245-QA-4). |

Re-review scope: files changed since gate 2 (head 93b76ddefd83; 6 non-document files, bundled copies and task documents excluded) — default.

---

## New Findings This Cycle

- **[medium/high]** `skills/develop-batch/SKILL.md:661` — "Mark `ticked: true` on every arm." contradicts line 648 (no tick on a failed stage) → reword. Reviewer CR-1; verified by reading lines 643-661. Gate id T245-QA-4. Reviewer CR-4 (the shape test matches a 200-character window and passes with the contradiction in place) is folded into the same fix.
- **[low/medium]** `shared/resources/qa-re-review-scope.md:241` — CR-2: the DIRTY_Z temp file is not removed if the block is interrupted between mktemp and the final rm → a trap; recommendations.future.
- **Not raised** — CR-3 (no population check across the copies): test E holds the shared source and both skill copies equal, and `bundle:check` holds the generated `references/` copies. The reviewer's description does not hold.

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer over the scoped patch. CI_SUMMARY: not read separately; the PR comment and gate run are the record. Reviewer time not measured.

Step 4b: not applicable beyond the earlier cycles; no fenced block changed since cycle 2's execution.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `skills/develop-batch/SKILL.md:661` — contradictory tick instruction → promoted to T245-QA-4.
- [low/medium] `shared/resources/qa-re-review-scope.md:241` — temp file not trapped → future.
- [low/medium] `shared/resources/qa-re-review-scope.md:227` — population check (not accepted, see above).

**Cleanups (1):**
- `evals/develop-batch/protocol/skill-shape.test.mjs:439` — proximity assertion would pass over the contradiction → folded into T245-QA-4.

boundary: false. The change set adds no accept/reject predicate; the HALT block is runnable prose already probed by test M7 and M8 through `runScope`.

---

## NFR Assessment

### Performance — PASS
No new cost.

### Reliability — CONCERNS
T245-QA-4.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- No input-accepting boundary is delivered.

### Maintainability — PASS
Copies held by test E and bundle:check.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding, in prose that decides whether a registry row is ticked.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T245-QA-4 fixed

---

**QA Report**: co-located at `task.245.qa.3.shared-checkout-safe-guards-and-staging.md`
**Gate File**: co-located at `task.245.gate.3.shared-checkout-safe-guards-and-staging.yml`
**Next Steps**: `/qa-fix` for T245-QA-4, then the Step 5c review.

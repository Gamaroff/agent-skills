# QA Report: Task 273 - qa-task steps state the routes they lack (cycle 2)

**Task**: [Link to task document](./task.273.qa-task-steps-state-the-routes-they-lack.md)
**Gate File**: [task.273.gate.2.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.2.qa-task-steps-state-the-routes-they-lack.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-1 finding (no CHANGELOG entry) is fixed. The cycle-2 refute pass found one new MEDIUM: the new reproduced-finding route (5d) contradicts four unchanged restatements of the gating rule, and does not say whether the `code_review_blocking: false` escape hatch overrides it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T273-CL-1 — no CHANGELOG entry citing (task 273) | ✅ FIXED | `changelog-cites.sh` reports `cites (task 273)`; commit a5168437 |

---

## Testing Scope

### Review Methodology

Direct tools, one read-only Explore reviewer with the cycle-2 refute directive over the whole branch diff (1056 patch lines; `references/` copies and `docs/tasks` excluded).

Diff review: code review (the set holds one code path, `evals/shared/tests/finding-anchors-callers.test.mjs`).
Re-review scope: unscoped, cycle 2 refute pass over the whole branch diff.
Step 4b: not applicable beyond what cycle 1 recorded; cycle 2 added no fenced bash block.
CI on a51684371aea: not read for this head (the fix commit was pushed minutes ago; the read is advisory and `/finalise` gates CI once on the final commit).

---

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1458` — step 5d and `code-review-prompt.md` QA item 4 gate a reproduced finding at any confidence and whether or not the doc opted in, while `skills/qa-task/SKILL.md` lines 893 and 1458 and `skills/qa-story/SKILL.md` lines 1392 and 2176 still say only an opted-in high-confidence bug gates → add an "except a finding QA reproduces (5d)" clause to each, and say which rule wins under an explicit `code_review_blocking: false` (verified by reading all four lines and `code-review-prompt.md:213`; a restatement population of four plus the escape-hatch line). Gate entry T273-CR-1.
- **[low]** `shared/resources/code-review-prompt.md:213` — the same escape-hatch ambiguity, folded into T273-CR-1.

---

## Success Criteria Verification

Unchanged from cycle 1 (see [the cycle 1 report](./task.273.qa.1.qa-task-steps-state-the-routes-they-lack.md)), except the criterion that each route is "present in `qa-task` and `qa-story`": the routes are present, and this cycle shows one of them (5d) conflicts with the text that restates the gating rule, so the criterion's "citing its observation" holds and its consistency does not yet.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: 5d contradicts four restatements of the gating rule**
- **Severity**: MEDIUM
- **Category**: Quality (enumeration risk)
- **Observation**: see New Findings
- **Impact**: a future QA run reading line 1458 or 893 concludes a reproduced medium finding is advisory and skips it
- **Recommendation**: align the four restatements and decide the escape-hatch rule in one place

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

Security PASS (reasoned, 0 probes; no boundary), Performance PASS (cycle 1 median develop 162 s, head 163 s), Reliability PASS, Maintainability PASS.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/qa-task/SKILL.md:1458` — see New Findings; promoted to the gate as T273-CR-1 (code review is blocking for this run).
- [low/medium] `shared/resources/code-review-prompt.md:213` — folded into T273-CR-1.

**Cleanups (0).**

mutation-proven: renamed the `(task 273)` citation in `CHANGELOG.md` → `changelog-entry-drift.test.mjs` stayed green (7 of 7) → no-red-untested. The test checks accepted tasks only; the guard for this task before acceptance is `changelog-cites.sh` (printed `missing` in cycle 1 and `cites` now) and `/finalise` 6d. Restored; `cmp` clean.

---

## Regression Testing

Cycle 2 changed `CHANGELOG.md` only. Cycle 1's full run (`CI=true npm test`, exit 0, 160 s) stands for the rest; `prettier --check CHANGELOG.md` is clean.

---

## Test Artifacts

### Test Commands Executed
```bash
bash .agents/skills/qa-task/references/changelog-cites.sh task.273
node --test evals/shared/tests/changelog-entry-drift.test.mjs
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Resolve T273-CR-1.

### Short-term Actions (Non-Blocking)
1. The three advisory findings from cycle 1 stay in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM that is a genuine contradiction between the new route and unchanged text.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` aligns the restatements.

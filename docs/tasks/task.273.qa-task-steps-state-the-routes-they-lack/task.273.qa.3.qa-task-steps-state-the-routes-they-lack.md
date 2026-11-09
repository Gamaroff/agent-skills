# QA Report: Task 273 - qa-task steps state the routes they lack (cycle 3)

**Task**: [Link to task document](./task.273.qa-task-steps-state-the-routes-they-lack.md)
**Gate File**: [task.273.gate.3.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.3.qa-task-steps-state-the-routes-they-lack.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-2 fix is verified. The scoped review found the same defect class at six more sites that the cycle-2 population probe did not match, one of them the gate-mapping step itself.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T273-CR-1 — 5d contradicts four restatements; escape hatch undecided | ✅ FIXED | the four lines now carry the 5d exception; the false-wins rule is stated in 5d (both skills) and in `code-review-prompt.md` item 4 and its `CR_BLOCKING=false` line; the cross-references resolve |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer over the files changed since gate 2.

Diff review: code review (the files in the scope are the two SKILL.md files and one shared prompt, all prose).
Re-review scope: files changed since gate 2 (head a51684371aea; 9 files, 6 after removing generated copies) — default.
Step 4b: not applicable — the cycle 2 fix adds no fenced bash block.
CI on 351de3c9: not read (the head was pushed minutes ago; `/finalise` gates CI on the final commit).

---

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:882` — the gate-mapping step ends "every cleanup or non-high-confidence finding — the gate is unaffected", and the same sentence stands at `skills/qa-story/SKILL.md:1381`; the report-template lines "advisory unless the doc opted in" stand at `skills/qa-task/SKILL.md` 1622 and 1936 and `skills/qa-story/SKILL.md` 1867 and 2479. All contradict step 5d. Verified by reading each line. Gate entry T273-CR-2.

---

## Success Criteria Verification

Unchanged from cycle 1, apart from the consistency note in the cycle 2 report.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: six more restatements of the gating rule contradict 5d**
- **Severity**: MEDIUM
- **Category**: Quality (enumeration risk)
- **Observation**: see New Findings. The cycle 2 population searched `stay advisory`, `always advisory` and `non-high-confidence`; these lines use `unaffected` and `advisory unless`.
- **Impact**: a QA run that reads the gate-mapping step alone treats a reproduced medium finding as advisory.
- **Recommendation**: derive the population from the rule's several wordings and replace the restatements by a citation of `code-review-prompt.md` item 4 where possible.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

Security PASS (reasoned, 0 probes; no boundary), Performance PASS, Reliability PASS, Maintainability PASS.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `skills/qa-task/SKILL.md:882` — see New Findings; promoted to the gate as T273-CR-2.

**Cleanups (0).**

No mutation proof this cycle: the fix is prose and the guard for restated-rule drift is the population probe, not a committed test.

---

## Regression Testing

`CI=true npm run ci:fast` exit 0 on 351de3c9 (8102 pass, 0 fail), run by qa-fix before the commit.

---

## Test Artifacts

### Test Commands Executed
```bash
git diff a51684371aea75f6312d04eba07e5b98c58bea44..HEAD
CI=true npm run ci:fast
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Resolve T273-CR-2.

### Short-term Actions (Non-Blocking)
1. The three advisory findings from cycle 1 stay in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM, the same class as cycle 2 at sites the probe did not reach.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` replaces the restatements by a citation.

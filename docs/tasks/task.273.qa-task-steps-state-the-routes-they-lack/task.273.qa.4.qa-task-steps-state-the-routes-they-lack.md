# QA Report: Task 273 - qa-task steps state the routes they lack (cycle 4)

**Task**: [Link to task document](./task.273.qa-task-steps-state-the-routes-they-lack.md)
**Gate File**: [task.273.gate.4.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.4.qa-task-steps-state-the-routes-they-lack.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-3 fix is verified. A wider search found three more restatements of the gating rule that still say a standalone run stays advisory unless the doc opts in.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T273-CR-2 — six restatements contradict 5d | ✅ FIXED | the gate-mapping step, four report-template lines and two prompt lines carry the 5d exception; the added clause parses in both skills |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer, told to search by the rule's meaning (`code_review_blocking`, `advisory`, `high-confidence`, `top_issues`) across the skills and shared resources, not by the patch's wording.

Diff review: code review (prose in two SKILL.md files and one shared prompt).
Re-review scope: files changed since gate 3 (head 351de3c9c773; 3 files after removing generated copies) — default, widened by the reviewer's repository search for the rule's wordings.
Step 4b: not applicable — no fenced bash block was added.
CI on 4369f285: not read (the head was pushed minutes ago; `/finalise` gates CI on the final commit).

---

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:50` and `skills/qa-story/SKILL.md:90` — "Absent for standalone runs → code review stays advisory unless the task opts in via frontmatter", with no 5d exception.
- **[medium]** `skills/qa-task/SKILL.md:895` and `skills/qa-story/SKILL.md:1394` — "standalone, behaviour is unchanged unless the task opts in", contradicted by 5d earlier in the same paragraph.
- The Resolution matrix in `shared/resources/code-review-prompt.md` resolves `CR_BLOCKING` for the reviewer claim and does not say that 5d sits outside it.

All four verified by reading the lines. Gate entry T273-CR-3.

---

## Success Criteria Verification

Unchanged from cycle 1, apart from the consistency note in the cycle 2 report.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: four more restatements of the gating rule, and the matrix, omit 5d**
- **Severity**: MEDIUM
- **Category**: Quality (enumeration risk)
- **Observation**: see New Findings. The two earlier population searches matched wordings, and these use "standalone ... unless the task opts in".
- **Impact**: a QA run that reads the Skill-arg paragraph concludes a standalone run never gates on a reproduced medium finding.
- **Recommendation**: fix the four sentences and add one sentence under the matrix.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

Security PASS (reasoned, 0 probes; no boundary), Performance PASS, Reliability PASS, Maintainability PASS.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `skills/qa-task/SKILL.md:50` — promoted to the gate as T273-CR-3.
- [medium/high] `skills/qa-story/SKILL.md:90` — folded into T273-CR-3.
- [low/medium] `skills/qa-task/SKILL.md:895` — folded into T273-CR-3.

**Cleanups (0).**

No mutation proof this cycle: the fix is prose, and the only guard for restated-rule drift is the population probe.

---

## Regression Testing

`CI=true npm run ci:fast` exit 0 on 4369f285 (8102 pass, 0 fail), run by qa-fix before the commit.

---

## Test Artifacts

### Test Commands Executed
```bash
git diff 351de3c9c773e7a98582c5b6a25de518eb73ed52..HEAD
CI=true npm run ci:fast
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Resolve T273-CR-3.

### Short-term Actions (Non-Blocking)
1. The three advisory findings from cycle 1 stay in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM, the same class as cycles 2 and 3, found at wordings the previous probes did not match.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` fixes the four sentences and the matrix note; the next gate is the last of five.

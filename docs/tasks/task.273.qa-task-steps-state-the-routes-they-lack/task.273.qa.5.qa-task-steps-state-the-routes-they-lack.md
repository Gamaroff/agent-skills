# QA Report: Task 273 - qa-task steps state the routes they lack (cycle 5)

**Task**: [Link to task document](./task.273.qa-task-steps-state-the-routes-they-lack.md)
**Gate File**: [task.273.gate.5.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.5.qa-task-steps-state-the-routes-they-lack.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-4 fix is verified. A reviewer that read every gating-rule statement in the three files end to end found the last two stale ones, the gate-decision notes in `qa-task` and `qa-story`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T273-CR-3 — Skill-arg paragraphs, closing sentences and matrix omit 5d | ✅ FIXED | the 5d exception reads correctly in both skills; the matrix note is present in `code-review-prompt.md` |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer, told to read the gate and advisory sections of `qa-task`, `qa-story` and `code-review-prompt.md` end to end and to grep the other consumers.

Diff review: code review (prose in two SKILL.md files and one shared prompt).
Re-review scope: files changed since gate 4 (head 4369f285805a; 3 files after removing generated copies), widened by the reviewer's end-to-end read.
Step 4b: not applicable — no fenced bash block was added.
CI on b873e8cc: not read (the head was pushed minutes ago; `/finalise` gates CI on the final commit).

---

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1460` and `skills/qa-story/SKILL.md:2178` — the blockquote note "Code-review findings" says findings do not enter `top_issues` by default and that only an opt-in appends them; the 5d exception sits on the last sentence only, and the run-level override is not mentioned. Verified by reading both lines. Gate entry T273-CR-4.

---

## Success Criteria Verification

Unchanged from cycle 1, apart from the consistency note in the cycle 2 report.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: the gate-decision note contradicts 5d**
- **Severity**: MEDIUM
- **Category**: Quality (enumeration risk)
- **Observation**: see New Findings. Four earlier searches matched phrases; this one was found by reading the section.
- **Impact**: a QA run reading the gate-decision note alone treats a reproduced bug as advisory.
- **Recommendation**: rewrite the note in both skills so the carve-out covers all of it.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

Security PASS (reasoned, 0 probes; no boundary), Performance PASS, Reliability PASS, Maintainability PASS.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/qa-task/SKILL.md:1460` — promoted to the gate as T273-CR-4.
- [medium/high] `skills/qa-story/SKILL.md:2178` — folded into T273-CR-4.

**Cleanups (0).**

No mutation proof this cycle: the fix is prose.

---

## Regression Testing

`CI=true npm run ci:fast` exit 0 on b873e8cc (8102 pass, 0 fail), run by qa-fix before the commit.

---

## Test Artifacts

### Test Commands Executed
```bash
git diff 4369f285805a8042797f6824d009c7931e1cad1c..HEAD
CI=true npm run ci:fast
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Resolve T273-CR-4. The budget of five gates is spent; a granted re-entry is needed.

### Short-term Actions (Non-Blocking)
1. The three advisory findings from cycle 1 stay in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM, the same subject as cycles 2 to 4, in a section the phrase searches did not reach.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: loop limit reached; see the escalation entry in the implementation report.

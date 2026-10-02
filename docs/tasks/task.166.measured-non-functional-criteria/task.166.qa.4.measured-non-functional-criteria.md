# QA Report: Task 166 - Give measured non-functional criteria a defined path through review and finalise (cycle 4)

**Task**: [task.166.measured-non-functional-criteria.md](./task.166.measured-non-functional-criteria.md)
**Gate File**: [task.166.gate.4.measured-non-functional-criteria.yml](./task.166.gate.4.measured-non-functional-criteria.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate.3](./task.166.gate.3.measured-non-functional-criteria.yml) CONCERNS 70/100. Fix commit `9c657e07`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR3-1 (medium) measured branch accepts a test-assertable bound | PARTIAL | The restriction is stated, but the trigger phrase is unrestricted (CR4-1) |
| CR3-2, CR3-3 (medium) task-doc restatements | FIXED | 0 stale phrases by grep — but the sites now carry the unrestricted trigger (CR4-2) |
| CR3-4 (low) SC 1 phrase pins | FIXED | Mutations dropping either phrase → red |
| CR3-5 (low) count pattern over-match | FIXED, with residue | "Step 3" and "kinds of evidence" allowed; "kinds of criteria" now hidden (CR4-3) |
| CR3-6 (low) raw-text count check | FIXED, with residue | Wrapped count caught; single-asterisk emphasis not (CR4-7) |
| CR3-7 (low) double finding | FIXED, over-broad | "alone" also excludes the post-merge rule (CR4-4) |

---

## New Findings This Cycle

- **[medium]** `skills/review-task/SKILL.md:1129` — the trigger phrase never carries the cycle-3 restriction (TASK-166-CR4-1)
- **[medium]** `task.166…md:92` and ~9 other sites — the unrestricted phrase is restated everywhere (TASK-166-CR4-2)
- **[low]** count lookahead hides "kinds of criteria" (TASK-166-CR4-3)
- **[low]** "This rule alone" excludes the post-merge rule (TASK-166-CR4-4)
- **[low]** an explicit "Not applicable" Performance line is flagged though finalise passes it (TASK-166-CR4-5)
- **[low]** two copies of the count pattern differ (TASK-166-CR4-6)
- **[low]** local asProse misses `*` / `_` emphasis; duplicates the shared helper (TASK-166-CR4-7)
- **[low]** qa-fix Change Log row sits above the gate rows it answers (TASK-166-CR4-8)

---

## Executive Summary

HIGH 0 for the fourth consecutive gate; MEDIUM 2 → 3 → 3 → 2. Four cycles have circled one rule's wording, because each fix edits a phrase that is restated verbatim at about ten sites and the restriction added in cycle 3 never reached the phrase. The fix this calls for is structural: state the rule once in review-task check 4, pin it there, and have the task document and the CHANGELOG cite it rather than restate it.

---

## Review Methodology

Direct tools plus one Explore subagent (133.5s).

```
Re-review scope: files changed since gate 3 (head 467351c0ec5a; 6 files) — default
```

`SAFETY_REPROBE`: false. Convergence check: no trip (HIGH 0, 0, 0, 0). `classifyLoopRoute` → `continue (not-a-pass-gate)`; route 2 declined (product-defect-signal). CI: hosted `Test` success on `467351c0` (informational).

---

## NFR Assessment

- **Security** — PASS · evidence: reasoned · probes executed: 0 · `boundary: false`
- **Performance** — PASS
- **Reliability** — PASS
- **Maintainability** — CONCERNS (one rule restated at ~10 sites)

---

## Code Review

`code_review_blocking=true`: CR4-1, CR4-2 are `bug` + `confidence: high` and are promoted. CR4-3..8 confirmed by QA and entered as low.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL — CR4-1, CR4-2 resolved · **Next**: qa-fix cycle 4 (the budget leaves one more cycle after it)

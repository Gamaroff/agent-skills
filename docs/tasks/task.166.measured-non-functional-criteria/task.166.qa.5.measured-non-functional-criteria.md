# QA Report: Task 166 - Give measured non-functional criteria a defined path through review and finalise (cycle 5)

**Task**: [task.166.measured-non-functional-criteria.md](./task.166.measured-non-functional-criteria.md)
**Gate File**: [task.166.gate.5.measured-non-functional-criteria.yml](./task.166.gate.5.measured-non-functional-criteria.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate.4](./task.166.gate.4.measured-non-functional-criteria.yml) CONCERNS 80/100. Fix commit `2b9c16ed`.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR4-1 (medium) trigger never carried the restriction | FIXED | Rule split by bound type; "a measuring command does not hold it" pinned; mutation → red |
| CR4-2 (medium) trigger restated at ~10 sites | FIXED | Old phrase: 0 by grep; task doc cites check 4 |
| CR4-3..6, CR4-8 (low) | FIXED | Shared count helper with fixtures; post-merge and N/A clauses pinned; Change Log row reordered |
| CR4-7 (low) emphasis normalisation | PARTIAL | `*`/`_` stripped, but a second normaliser now sits beside asProse (CR5-4) |

---

## New Findings This Cycle

- **[medium]** `skills/review-task/SKILL.md:1122` — an unbounded criterion with a planned per-PR test reads as "held neither way"; finalise passes it on the behaviour path. Regression: cycle 4 dropped "a tested criterion needs no bound and no command" and its pin (TASK-166-CR5-1)
- **[low]** N/A exemption requires a reason finalise does not (TASK-166-CR5-2)
- **[low]** shared count pattern misses wrapped emphasis and quoted qualifiers (TASK-166-CR5-3)
- **[low]** two normalisers in one pin (TASK-166-CR5-4)
- **[low]** CHANGELOG and test header restate without the check-4 citation (TASK-166-CR5-5)

---

## Executive Summary

The consolidation held: one statement of the rule, cited elsewhere, and no stale phrase anywhere. One medium regression from the consolidation itself (CR5-1). HIGH 0 for the fifth consecutive gate; MEDIUM 3 → 2 → 1 over cycles 3–5.

---

## Review Methodology

Direct tools plus one Explore subagent (224.2s).

```
Re-review scope: files changed since gate 4 (head 9c657e07ed31; 8 files) — default
```

`SAFETY_REPROBE`: false. Convergence: no trip. `classifyLoopRoute` → `continue (not-a-pass-gate)`; route 2 declined (non-test-finding). This is cycle 5 = `QA_MAX_CYCLES`: after 5b, Loop Escalation evaluates route 2c (gate-the-last-fix). QA's own checks on this head: `bundle:check` 0 problems; `quick_validate` finalise ✓ review-task ✓; review-task SKILL.md links resolve; the AC pin passes run from `/tmp`.

---

## NFR Assessment

- **Security** — PASS · evidence: reasoned · probes executed: 0 · `boundary: false`
- **Performance** — PASS
- **Reliability** — PASS (cross-tree import resolves from any cwd)
- **Maintainability** — PASS (rule stated once, cited elsewhere)

---

## Code Review

`code_review_blocking=true`: no finding is `confidence: high` + `bug` at medium; CR5-1 (medium/medium) was confirmed by QA against check 4's text and finalise Step 3's behaviour path, and entered. CR5-2..5 entered as low.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL — CR5-1 resolved

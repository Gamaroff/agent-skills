# QA Report: Task 288 - Gating-rule restatements carry the reproduced-bug exception

**Task**: [Link to task document](./task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md)
**Gate File**: [task.288.gate.3.gating-rule-restatements.yml](./task.288.gate.3.gating-rule-restatements.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-23
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 re-reviews the qa-fix cycle 2 changes. Both cycle-2 findings are closed. The reviewer found two low cleanups in the guard test, advisory only.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

## Review Methodology

Direct tools plus one read-only Explore reviewer (35 s, `duration_ms` 35040). Route: Diff review: code review. Re-review scope: files changed since gate 2 (head b7bc2f049; 4 files outside docs, of which 2 are generated copies) — default. Step 4b: not applicable — the changed prose has no fenced bash block. CI_SUMMARY: CI on 144f2a1dd1b9: pending (recorded, changes nothing).

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T288-C2-1 (false exemption reason) | FIXED: prompt now says "on the reviewer claim alone"; EXEMPT entry deleted. Reverting the wording turns the main guard red. |
| T288-C2-2 (assertion over an empty set) | FIXED: checks every "advisory unless" sentence, floor of four. Dropping the run-level wording from the qa-task template line turns T273-CR-6 red. |

## New Findings This Cycle

- **[low]** `evals/shared/tests/gating-rule-restatements.test.mjs:292` — the "Absent for standalone runs" skip is a bare prefix match over every file → limit it to the two known sentences (C3-1).
- **[low]** same file, line 296 — the floor of four equals the current count and repeats the T288-CR-1 floor (C3-2).

## Code Review

**Correctness bugs (0).**

**Cleanups (2):**
- `evals/shared/tests/gating-rule-restatements.test.mjs:292` — bare prefix skip (C3-1).
- `evals/shared/tests/gating-rule-restatements.test.mjs:296` — duplicate floor with no slack (C3-2).

Reviewer line text was HTML-escaped (`&amp;&amp;`, `&gt;=`); the anchors are the lines holding `&&` and `>=`.

mutation-proven: drop the run-level wording from the qa-task template line → T273-CR-6 red → dev-only (run in the qa-fix cycle, recorded in the fix PR comment, not re-run this cycle).
mutation-proven: revert the docs-only prompt wording → the main guard test red → dev-only (same).

## Success Criteria

Unchanged from cycle 1: all met. Criteria drift: clean.

## NFR Assessment

Security PASS (reasoned, no boundary). Performance PASS. Reliability PASS. Maintainability PASS.

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Test Commands Executed**
```bash
npm run test:remote   # 8745 pass, 0 fail (in the qa-fix cycle, at the head before this QA commit)
```

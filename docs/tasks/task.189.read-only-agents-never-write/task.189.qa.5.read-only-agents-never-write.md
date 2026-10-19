# QA Report: Task 189 - Read-only agents never write (cycle 5)

**Task**: [Link to task document](./task.189.read-only-agents-never-write.md)
**Gate File**: [task.189.gate.5.read-only-agents-never-write.yml](./task.189.gate.5.read-only-agents-never-write.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| CR4-1 wait without budget | ✅ FIXED | block marks with plan-derived budget and clears (F1, F2 red) |
| CR4-2 Step 8a.4 re-run not backgrounded | ✅ FIXED | consolidated into the block; 8a.4 runs it as Step 3b.1 does |
| CR4-3 jq | ✅ FIXED | node validation; jq-less test (F4 red) |
| CR4-4 `--record=` | ✅ FIXED | matcher + controls (F6 red) |
| CR4-5 falsy duplicate | ✅ FIXED | findIndex (F5 red) |

bug.5 reopened: iteration 2 introduced CR5-1.

---

## New Findings This Cycle

- **[medium/high]** `skills/finalise/SKILL.md:550` — `${BUDGET:?}` aborts before the stale result is removed; a failed runner import leaves an earlier result for item 3, with no exit or no-result line. **CR5-1, promoted** — [task.189.bug.5.step-3b1-foreground-run-outlives-tool-call.md](./task.189.bug.5.step-3b1-foreground-run-outlives-tool-call.md)
- **[low/low]** `skills/finalise/SKILL.md:542` — the wait is marked by the background process, not before the yield (CR5-2)
- **[cleanup]** `shared/resources/tests/read-only-agent-writes.test.mjs:563` — killed-runner test reaches the budget path by accident (CR5-3)
- **[cleanup]** `skills/finalise/SKILL.md:2876` — "item 2" is ambiguous inside Step 8a's list (CR5-4)

---

## Executive Summary

Scoped re-review of `74f9e5bc` (head `74f9e5bc3987`). Cycle-4 fixes hold; boundaries engage (28 executed, 0 reproduced). One medium introduced by the cycle-4 fix's ordering. This is the last budgeted cycle (5 of 5).

**Overall Assessment**: CONCERNS · **Deployment**: CONDITIONAL

---

## Testing Scope

Re-review scope: files changed since gate 4 (head 95248a8476a6; 4 source files) — default. `SAFETY_REPROBE=false`. One Explore reviewer, 106 s. Anchors: 4/4 `ok`. Run from the loaded `/qa-task` instructions.

## NFR Assessment

- **Security — PASS** — Evidence: measured; Probes executed: 28 (`task.189.qa.5.security.run.json`)
- **Reliability — CONCERNS** — CR5-1
- **Performance — PASS** · **Maintainability — PASS**

## Code Review

Correctness bugs (2): CR5-1 [medium/high] promoted; CR5-2 [low/low]. Cleanups (2): CR5-3, CR5-4.

Cycle-4 fix proofs (5b, committed tests): F1 budget → covered; F2 clear → covered; F3 argv order → covered (11 red); F4 jq → covered; F5 falsy duplicate → covered; F6 `=` spelling → covered. 6 of 6.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` cycle 5 (last budgeted), then the loop-limit check

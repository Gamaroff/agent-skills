# QA Report: Task 189 - Read-only agents never write (cycle 4)

**Task**: [Link to task document](./task.189.read-only-agents-never-write.md)
**Gate File**: [task.189.gate.4.read-only-agents-never-write.yml](./task.189.gate.4.read-only-agents-never-write.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| QA3-1 foreground Step 3b.1 run | ⚠️ PARTIAL | backgrounded + atomic result (E1, E2 red); wait has no budget (CR4-1) and Step 8a.4's re-run is not backgrounded (CR4-2) — bug.5 reopened |
| CR3-2 duplicate inline ids | ✅ FIXED | refused (E3 red); a falsy-element edge remains (CR4-5, cleanup) |
| CR3-3 owned-flag lists | ✅ FIXED | all six named; checked against `OWNED_FLAGS` (E4 red) |

---

## New Findings This Cycle

- **[medium/high]** `skills/finalise/SKILL.md:524` — the background wait has no `--budget-minutes`; 10-minute default vs a 20-minute per-entry bound. **CR4-1, promoted** — [task.189.bug.5.step-3b1-foreground-run-outlives-tool-call.md](./task.189.bug.5.step-3b1-foreground-run-outlives-tool-call.md) (reopened)
- **[medium/medium]** `skills/finalise/SKILL.md:2853` — Step 8a.4 re-runs the block without the background rule (CR4-2, advisory)
- **[low]** `skills/finalise/SKILL.md:546` — a missing `jq` reads as "did not complete" (CR4-3)
- **[low]** `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:557` — regex misses `--record=<path>` (CR4-4)
- **[cleanup]** `shared/resources/security-probe-plan.mjs:250` — falsy duplicate element hides the refusal (CR4-5)

---

## Executive Summary

Scoped re-review of `95248a84` (head `95248a845b62`). Cycle-3 fixes hold; the boundaries engage. The backgrounding fix needs its wait budget and must reach Step 8a.4 too — both are one subject (how Step 3b.1's block is run), restated at two sites.

**Overall Assessment**: CONCERNS · **Deployment**: CONDITIONAL

---

## Testing Scope

Re-review scope: files changed since gate 3 (head 815f45b8b68e; 5 source files) — default. `SAFETY_REPROBE=false` (clause 1 false; no safety-axis finding). One Explore reviewer, 89 s. Anchors: 5/5 `ok`. Run from the loaded `/qa-task` instructions.

## Success Criteria Verification

Unchanged — all PASS. `npm run ci:fast` 5807/0 at `95248a84`.

## NFR Assessment

- **Security — PASS** — Evidence: measured; Probes executed: 28 (`task.189.qa.4.security.run.json`)
- **Reliability — CONCERNS** — CR4-1, CR4-2
- **Performance — PASS** · **Maintainability — PASS**

## Code Review

Correctness bugs (4): CR4-1 [medium/high] promoted; CR4-2 [medium/medium]; CR4-3 [low/medium]; CR4-4 [low/medium]. Cleanups (1): CR4-5.

Cycle-3 fix proofs (5b, committed tests): E1 partial-result move → covered; E2 stale result → covered; E3 duplicate ids → covered; E4 owned-flag prose → covered. 4 of 4.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` cycle 4 — consolidate the run rule into the block (Step 2.6, repeat subject)

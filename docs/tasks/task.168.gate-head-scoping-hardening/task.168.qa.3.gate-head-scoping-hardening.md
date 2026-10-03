# QA Report: Task 168 - Harden task.135's gate-head scoping (cycle 3)

**Task**: [Link to task document](./task.168.gate-head-scoping-hardening.md)
**Gate File**: [task.168.gate.3.gate-head-scoping-hardening.yml](./task.168.gate.3.gate-head-scoping-hardening.yml)
**Previous Gate**: [task.168.gate.2.gate-head-scoping-hardening.yml](./task.168.gate.2.gate-head-scoping-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Gate Status**: PASS

---

## Executive Summary

Every cycle-2 finding is fixed: the QA loop's red-fast-gate exit and the new uncommitted-fix HALT now agree, and `.claude/state` is out of the tracked check. The scoped cycle-3 review found three LOW items and nothing above. Every NFR is PASS. The loop's route classifier took the **Cosmetic-residue exit** (route 2b), so the three LOWs are carried to `recommendations.future` and the task's Deferred Work rather than spending a fix cycle on them.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T168-QA2-CR-1 — red-fast-gate exit stranded by the HALT | FIXED | Loop doc 5b step 0a commits the attempt without pushing; L15; loop-doc pin (mutation back to "commit nothing" → red) |
| T168-QA2-CR-2 — `.claude/state` not excluded from the tracked check | FIXED | L5 extended with a tracked, modified file (mutation → L5 red) |
| T168-QA2-CR-3 — trigger's untracked policy undocumented | FIXED | Comment in qa-task Phase 0 step 3 |
| T168-QA2-CR-4 — wrong occupants named for `WORK_ITEM_DIR` | FIXED | Comment reworded in the shared block and both preambles |

## Review Methodology

Direct tools, plus one read-only reviewer (single pass, re-review). The diff was built by executing the shipped Step 3b fence, which took the scoped arm for the first time on a real branch. Reviewer dispatched 2026-10-03T15:59:52Z; duration 145 s (`duration_ms` 145296).

Re-review scope: files changed since gate 2 (head deb5e7727be4; 20 files) — default

- Step 4b: qa-task, qa-story and the shared rule as before, plus `develop-pipeline-step-5-6-qa-loop.md` (1 runnable, 1 placeholder, 19 mutating). Zero findings.
- Platform variance: `TMPDIR=/tmp` over the four suites → 176 tests, 0 fail. `npm run validate` is clean for qa-task, qa-story, develop-task and develop-story.

---

## New Findings This Cycle

- **[low]** `skills/qa-task/SKILL.md:246` — the Phase 0 trigger still counts a tracked `.claude/state` change as movement (T168-QA3-CR-1).
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1093` — the push-budget statements do not name the red exit as a second zero-push case (T168-QA3-CR-2).
- **[low]** `shared/resources/tests/qa-scope-from-head.test.mjs:859` — L15 cannot tell local HEAD from a pushed branch (T168-QA3-CR-3).

All three are carried by route 2b; none is fixed this cycle.

---

## Loop Route

- Convergence check: HIGH sequence `0, 0, 0` → does not trip (`HIGH_N = 0`).
- `classifyLoopRoute` (cycle 3, globs from `qa.testArtifactGlobs`): `cosmetic-residue`.
- Loop exit: Cosmetic-residue exit taken — PASS gate at cycle 3 with HIGH 0 for cycles 2 and 3; all 3 open findings are LOW and are carried to the gate's recommendations.future by id (T168-QA3-CR-1, T168-QA3-CR-2, T168-QA3-CR-3). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.

## Success Criteria Verification

All six functional criteria PASS (L1–L15, the parity and freshness suites). Code quality: mutation proofs are recorded for every fix in cycles 0–2. Migration: CHANGELOG names the fixes, including the loop-doc change.

## NFR Assessment

- **Security — PASS** · Evidence: reasoned · Probes executed: 0 · `boundary: internal` (`qa-safety-clause1.sh#main`; gate-file input; no sink models gate YAML).
- **Performance — PASS**
- **Reliability — PASS** — the HALT and the loop's red exit now agree.
- **Maintainability — PASS**

## Code Review

**Correctness bugs (2):** [low/medium] T168-QA3-CR-1, [low/medium] T168-QA3-CR-2 — enumeration gaps.
**Cleanups (1):** T168-QA3-CR-3.
**Mutation proofs (cycle-2 fixes):** `covered` × 2 — CR-1 (loop-doc pin), CR-2 (L5).

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment**: APPROVED
**Next Steps**: Step 5c `/review-pr`, then `/finalise`. Three LOWs are deferred — see the task's Deferred Work.

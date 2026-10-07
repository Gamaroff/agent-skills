# QA Report: Task 168 - Harden task.135's gate-head scoping (cycle 2)

**Task**: [Link to task document](./task.168.gate-head-scoping-hardening.md)
**Gate File**: [task.168.gate.2.gate-head-scoping-hardening.yml](./task.168.gate.2.gate-head-scoping-hardening.yml)
**Previous Gate**: [task.168.gate.1.gate-head-scoping-hardening.yml](./task.168.gate.1.gate-head-scoping-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

All five cycle-1 findings are fixed, and each fix has a red mutation proof. The cycle-2 refute pass found one medium. The uncommitted-fix HALT now runs on every re-review arm, and that collides with the QA loop's own red-fast-gate path. That path commits nothing before the next review, so the next review HALTs and never writes the gate the loop counts. Three low findings are about `.claude/state` in the tracked check, the trigger's undocumented untracked-file policy, and an incorrect comment.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — T168-QA2-CR-1 fixed and re-reviewed

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T168-QA1-CR-1 — HALT fired on untracked files the pipeline restores | FIXED | L10 (bash + zsh); mutation (untracked HALTs again) → L10 red |
| T168-QA1-CR-2 — HALT guarded only the scoped arm | FIXED | L11 cycle 2 / safety / schema-1; mutation (back to scoped arm) → L11 red |
| T168-QA1-CR-3 — rebind discarded the helper's refusal | FIXED | L13 + L14, both skills; two mutations red |
| T168-QA1-CR-4 — call-count assertion counted prose | FIXED | per-fence assertion; mutation (Step 3b call dropped, path left in a comment) → red |
| T168-QA1-CR-5 — agreement test used a copied sed | FIXED | shipped sed extracted; mutation (trailing-space strip removed) → red after the test's `.trim()` mask was removed |

## Review Methodology

Direct tools, plus one read-only refute-pass reviewer (cycle 2: whole-branch diff, `REFUTE_PASS=true`). The diff was built by executing the shipped Step 3b fence itself on this branch. The new uncommitted-fix check ran on the real tree and passed: the only dirt was the implementation report, inside the work item. Reviewer dispatched 2026-10-03T15:44:57Z; duration 231 s (`duration_ms` 230518).

Re-review scope: unscoped — cycle 2 refute pass (whole branch, 25 files, 3,901 diff lines)

- Step 4b: the same counts as cycle 1 (qa-task 1/3/16, qa-story 1/4/14, shared rule `no-executable-blocks`) and zero findings. The changed blocks are covered by `qa-scope-from-head.test.mjs` L1–L14.
- Platform variance: `TMPDIR=/tmp` over the four suites → 173 tests, 0 fail.
- `npm run validate -- skills/qa-task/` and `skills/qa-story/`: clean.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (5b step 0a, bounded retry) — after a second red fast gate the cycle "commits nothing" and the next QA review is meant to write the gate. With the HALT on every re-review arm, that review HALTs on qa-fix's uncommitted tracked edits instead. Task §5's claim that a pipeline run never reaches the HALT is therefore false. → Commit the red attempt without pushing, and correct §5 (T168-QA2-CR-1). The code-review finding is `bug`/`high` confidence, promoted under `code_review_blocking`.
- **[low]** `shared/resources/qa-re-review-scope.md` — the tracked check does not exclude `.claude/state`, so a consumer that tracks `.claude/` HALTs on its own lock → exclude it there too (T168-QA2-CR-2).
- **[low]** `skills/qa-task/SKILL.md` Phase 0 step 3 — it counts an untracked file as movement, which Step 3b now treats as normal, and this is undocumented → state the deliberate choice (T168-QA2-CR-3).
- **[low]** the comment on the `WORK_ITEM_DIR` exclusion names the wrong occupants: the gate and report are written after Step 3b → reword (T168-QA2-CR-4).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | L1, L2, L7, L8, L13, L14 |
| Phase 2 | PASS | L9; parity 61/61 |
| Phase 3 | CONCERNS | CR-1 (loop-contract collision); L3–L6, L10–L12 green |

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Invalid head → `CODE_MOVED=1` | PASS | L1, L2 |
| `:`-named file in patch | PASS | L3 |
| Security FAIL + bound `false` → whole branch | PASS | L9 |
| Step 3b HALTs on an uncommitted change outside the work item | PASS (now every re-review arm) | CR-1 is about the loop that feeds it, not the criterion |
| `qa-cycle.sh` refusal → HALT with the reason | PASS | L7, L8, L13 |
| `field()` and sed agree | PASS | shipped-sed test |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3. No bug-report files: every finding is recorded in the gate and this report, and the medium carries its `file:` and action.

## NFR Assessment

- **Security — PASS** · Evidence: reasoned · Probes executed: 0 · `boundary: internal`, unchanged since cycle 1 (`qa-safety-clause1.sh#main` reads only a pipeline-written gate file; no sink models gate YAML).
- **Performance — PASS**
- **Reliability — CONCERNS** — CR-1.
- **Maintainability — PASS**

## Code Review

**Correctness bugs (3):**
- [medium/high] `shared/resources/qa-re-review-scope.md:219` → loop-doc red-gate path vs. the HALT (T168-QA2-CR-1, promoted)
- [low/medium] `shared/resources/qa-re-review-scope.md:218` → `.claude/state` in the tracked check (T168-QA2-CR-2)
- [low/low] `skills/qa-task/SKILL.md:493` → trigger's untracked policy undocumented (T168-QA2-CR-3)

**Cleanups (1):**
- `skills/qa-task/SKILL.md:454` → comment names the wrong occupants of the work-item dir (T168-QA2-CR-4)

**Mutation proofs (cycle 1 fixes, this cycle):** `covered` × 6 — CR-1, CR-2, CR-3 (swallow), CR-3 (first-review), CR-4, CR-5.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3.

# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.8.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.8.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 8 — the first of a second grant of two (budget 9) — narrowed to the 2 files the cycle-7 fix touched. The cycle-7 fixes hold on `e4ab4d56`: 111 targeted tests; a parent beside its bug counts its own report under both shells; the kind block HALTs on verbatim placeholders. No HIGH. Two MEDIUM: the cycle-7 gate-path lookup sorts lexically — on the repo's own task.110 (19 gates) it returns `gate.9` — the defect BUG-14 fixed for reports one block over, shared by the three DoD lookups (BUG-21); and `CYCLES` is computed in the 6a block and consumed in 6b's body, another block, so by the skill's own per-block rule the QA Cycles line is silently omitted at exit 0 — the cycle-6/7 work on that block was inert (BUG-22). Three cleanups taken as LOW: a dead `case` arm, the duplicated report locator (closed by the BUG-22 consolidation), and a zsh abort inside `ADD_PATHS=(…)` that pre-empts 7.6a's HALT.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T08:12:56Z (gate 7 `updated:`) — 5 files changed since gate 7, 2 reviewable; 1599 diff lines.** `SAFETY_REPROBE=false`. Cycle ≥ 3: narrowed. First cycle of the second grant.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-19 parent picks its bug's report | **FIXED** | Block run by hand with STEM=task.67, DOC_KIND=task beside `task.67.bug.3.implementation.2.*` → `CYCLES=[1]` under bash + zsh; executed case green. (But see BUG-22: the value never reaches 6b.) |
| TASK-125-BUG-20 kind block unguarded | **FIXED** | Kind block run verbatim under zsh → HALT exit 1; executed case × 2 shells. |
| CR-3 dead `N/A` | **FIXED** (residual: BUG-21 ordering) | `GATE_PATH` resolved and checked; no-gate → HALT executed. |
| CR-4 skip-table slice | **FIXED** | Bounded; decoy-table control green. |

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1611` — gate/DoD lookups sort lexically → **TASK-125-BUG-21** (reviewer CR-1, reproduced on task.110)
- **[medium]** `skills/finalise/SKILL.md:1536` — `CYCLES` crosses a block boundary → **TASK-125-BUG-22** (CR-2, verified: `[ "" -gt 0 ]` errors into `|| true`)
- **[low]** CR-3 dead `''|` arm at four sites; **[low]** CR-5 zsh abort in `ADD_PATHS=(…)`; CR-4 duplicated locator — closed by BUG-22's consolidation

---

## Testing Scope

- [x] Task document exists; status `ready-for-review`; PR #447 OPEN, head `e4ab4d56`
- [x] 3/3 phases; `npm run ci:fast` 3733/3733 at the cycle-7 fix; `bundle:check` 0
- [x] Automated — 111 targeted; Regression — targeted on head, fast gate at the fix commit; Security — no new boundary (reasoned)
- [x] Code Review — Step 3b, narrowed (2 files / 1599 lines), Explore reviewer (267 s; 5 findings, the 51 bug-mode tests executed under both shells; every finding re-verified by QA)
- [x] Manual — cycle-count block parent-beside-bug × 2 shells; kind block verbatim; `ls | sort | tail -1` on task.110's 19 gates; `[ "" -gt 0 ]` behaviour

Re-review, cycle 8: direct tools + one narrowed reviewer; traceability matrix from cycle 1; `code_review_blocking=true`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | BUG-19/20 fixed; **BUG-21**, **BUG-22**; CR-3, CR-5. |
| Phase 2 | PASS | Unchanged since gate 3. |
| Phase 3 | PASS | Unchanged since gate 6. |

**Overall Phase Completion**: 3/3 delivered; 0 FAIL, 1 CONCERNS

## Success Criteria Verification

SC1 CONCERNS (a stale Final Gate on ≥ 10 gates; the cycle count never reaches the comment); SC2–SC7 PASS; SC8 PENDING. Breaking changes: none; the no-flag promise holds (executed). **PASS**

---

## Issues Found

### HIGH (0)
### MEDIUM (2)
- **BUG-21** [task.125.bug.21](./task.125.bug.21.gate-and-dod-globs-sort-lexically-gate-9-beats-gate-19.md) — lexical gate/DoD order. P2.
- **BUG-22** [task.125.bug.22](./task.125.bug.22.cycles-computed-in-6a-consumed-in-6b-another-block-line-silently-omitted.md) — `CYCLES` across blocks. P2.
### LOW (2 in gate)
- **CR-3** dead arm; **CR-5** zsh abort in the array assignment. (CR-4 closed by BUG-22.)

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

Performance PASS · Reliability CONCERNS (BUG-21/22, CR-5) · Security PASS (reasoned; cycle-2 measured probe unchanged) · Maintainability PASS (CR-3; the duplicated `fix_cycle` guard stays a follow-up task).

---

## Code Review

Step 3b, narrowed, 267 s. QA verification: CR-1 reproduced (`ls docs/tasks/task.110.*/task.110.gate.*.yml | sort | tail -1` → `gate.9`, 19 on disk) → **BUG-21**; CR-2 verified by executing the body line with `CYCLES` unset (`[: : integer expected`, empty line, rc 0) and by the skill's own TASK-121-BUG-2 rule → **BUG-22** (QA-owned; reviewer medium confidence); CR-3, CR-5 read → low, taken; CR-4 read → closed by the BUG-22 consolidation.

**Correctness bugs (2):** CR-1 medium/high → gate MEDIUM; CR-2 medium/medium → gate MEDIUM after verification. **Cleanups (3):** CR-3, CR-5 → gate LOW; CR-4 → folded into BUG-22.

**Provenance:** BUG-21 is the cycle-7 CR-3 fix (and the DoD lookups from cycles 2–6); BUG-22 predates the branch in shape (the 6a/6b split is original) but the cycle-count block is what cycles 6–7 changed, and its consumer was never checked. Both this branch's to fix.

**Boundary rule:** `boundary: false`; `probes_executed: 0`; security `reasoned`. **Mutation-proof spot check:** cycle-7's four mutations proved at the fix commit; `not-run` this cycle. **Working tree:** QA artefacts only.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode`, `gh-labels`, `qa-cycle` (111) on `e4ab4d56` | PASS |
| Full fast gate (3733, 1 skip) at the cycle-7 fix commit | PASS |

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 111 pass
<6a cycle-count block> STEM=task.67 DOC_KIND=task beside task.67.bug.3.implementation.2.* → CYCLES=[1] (bash, zsh)   # BUG-19 fixed
<Document-kind block> verbatim under zsh → HALT exit 1   # BUG-20 fixed
ls docs/tasks/task.110.*/task.110.gate.*.yml | sort | tail -1   # → gate.9 of 19 (BUG-21)
unset CYCLES; [ "$CYCLES" -gt 0 ] && echo line || true   # → integer expected; empty; rc 0 (BUG-22)
```

---

## Recommendations

**Immediate (Blocking):** BUG-21 — numeric ordering for every `.gate.`/`.dod.` lookup, zsh-safe, ≥ 10 case. BUG-22 — derive the cycle count inside 6b after its cross-check; delete the 6a block. CR-3 — drop the dead arm. CR-5 — resolve `DOD_PATH` first in 7.6a.
**Short-term:** the `qa-cycle.sh --cycle` follow-up.

---

## Final Assessment

**Gate Status**: CONCERNS — Rule 2, two MEDIUM, no HIGH. HIGH 1,1,0,1,0,0,0,0; MEDIUM 6,3,1,0,4,1,2,2. **Quality Score**: 80/100. **Deployment**: CONDITIONAL on BUG-21, BUG-22, CR-3, CR-5.

**QA Report**: co-located at `task.125.qa.8.develop-bug-finalise-mode-and-issue-create.md` · **Gate File**: `task.125.gate.8.develop-bug-finalise-mode-and-issue-create.yml` · **Next Steps**: `/qa-fix` cycle 8; cycle 9 (last of the second grant) re-review.

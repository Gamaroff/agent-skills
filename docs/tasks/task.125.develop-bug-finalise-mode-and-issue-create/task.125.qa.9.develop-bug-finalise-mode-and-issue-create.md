# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.9.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.9.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 9 — the last of the second grant (budget 9) — narrowed to the 2 files the cycle-8 fix touched. The cycle-8 fixes hold on `e78e66a8` (115 targeted tests: `gate.19`/`dod.10` ordering across 6b/7.6a/7.6b, `CYCLES` published by 6b, the 7.6a no-DoD HALT identical under both shells). No HIGH. One MEDIUM, one line over from where the block already refuses the same class: a `**Verdict**:` line left as the verify-loop template's own placeholder `{PASS / FAIL}` publishes PASS at exit 0 (BUG-23, executed). One LOW: the directory placeholder is passed unquoted and a missing directory shares the DoD HALT (CR-4). Two findings routed to future with reasons — the two orchestrator report lookups that still path-sort are on `origin/develop`, and hoisting the helper into a script needs a cwd contract the fenced blocks do not carry.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T08:36:10Z (gate 8 `updated:`) — 5 files changed since gate 8, 2 reviewable; 1692 diff lines.** `SAFETY_REPROBE=false`. Cycle ≥ 3: narrowed.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-21 lexical gate/DoD order | **FIXED** | Executed ordering case: `dod.10` over `dod.9`, `gate.19`'s verdict over `gate.9`'s, in 6b/7.6a/7.6b × 2 shells. |
| TASK-125-BUG-22 `CYCLES` across blocks | **FIXED** | 6b derives and prints `CYCLES` (pinned 2 for the fixture report); the separate 6a block is gone. |
| CR-3 dead arm | **FIXED** | `grep -c "in ''|"` → 0. |
| CR-5 zsh abort in the array assignment | **FIXED** | 7.6a with no DoD → the HALT text under bash and zsh, no shell nomatch error (executed). |
| CR-4 duplicated locator | **FIXED** | One locator in 6b. |

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1598` — placeholder verdict reads as PASS → **TASK-125-BUG-23** (reviewer CR-1, medium confidence; verified by execution, QA-owned)
- **[low]** `skills/finalise/SKILL.md:1216` — unquoted `{document-directory}`; one HALT for two states (CR-4)
- **future**: CR-2 — `develop-story`/`develop-task` Step 0 `ls …implementation.*.md | sort | tail -1` path-sorts (pre-existing on `origin/develop`; the obs #145 sweep + an enumeration test); CR-3 — hoist `newest_numbered` into a `references/` script once the blocks carry a cwd contract

---

## Testing Scope

- [x] Task document exists; status `ready-for-review`; PR #447 OPEN, head `e78e66a8`
- [x] 3/3 phases; `npm run ci:fast` 3737/3737 at the cycle-8 fix; `bundle:check` 0
- [x] Automated — 115 targeted; Regression — targeted on head, fast gate at the fix commit; Security — no new boundary (reasoned)
- [x] Code Review — Step 3b, narrowed (2 files / 1692 lines), Explore reviewer (252 s; 4 findings, the 55 bug-mode tests executed under both shells; every finding re-verified by QA)
- [x] Manual — `printf '**Verdict**: {PASS / FAIL}' | grep -oE 'PASS|FAIL' | head -1` → PASS; `git show origin/develop:skills/develop-task/SKILL.md` carries the path-sort (CR-2 pre-existing)

Re-review, cycle 9: direct tools + one narrowed reviewer; traceability matrix from cycle 1; `code_review_blocking=true`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | BUG-21/22 fixed; **BUG-23**; CR-4. |
| Phase 2 | PASS | Unchanged since gate 3. |
| Phase 3 | PASS | Unchanged since gate 6. |

**Overall Phase Completion**: 3/3; 0 FAIL, 1 CONCERNS. SC1 CONCERNS (a placeholder verdict can publish PASS); SC2–SC7 PASS; SC8 PENDING. Breaking changes: none; the no-flag promise holds (executed). **PASS**

---

## Issues Found

### HIGH (0)
### MEDIUM (1)
- **BUG-23** [task.125.bug.23](./task.125.bug.23.template-placeholder-verdict-publishes-pass.md) — placeholder verdict → PASS. P2.
### LOW (1 in gate)
- **CR-4** unquoted directory placeholder; one HALT for two states.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (+2 future)

---

## NFR Assessment

Performance PASS · Reliability CONCERNS (BUG-23, CR-4) · Security PASS (reasoned; cycle-2 measured probe unchanged) · Maintainability PASS (CR-3 and the duplicated `fix_cycle` guard as follow-ups).

---

## Code Review

Step 3b, narrowed, 252 s. QA verification: CR-1 executed → **BUG-23** (QA-owned; reviewer medium confidence); CR-2 checked against `origin/develop` → pre-existing → `recommendations.future` (Step 3b 5b rule; severity and confidence kept as returned); CR-3 read → future, reason recorded; CR-4 read → low, taken.

**Correctness bugs (2):** CR-1 medium/medium → gate MEDIUM after verification; CR-2 low/medium → future (pre-existing). **Cleanups (2):** CR-3 → future; CR-4 → gate LOW.

**Provenance:** BUG-23's grep is the cycle-4 fix; CR-2's sites predate the branch. **Boundary rule:** `boundary: false`; `probes_executed: 0`; security `reasoned`. **Mutation-proof spot check:** cycle-8's three mutations proved at the fix commit; `not-run`. **Working tree:** QA artefacts only.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode`, `gh-labels`, `qa-cycle` (115) on `e78e66a8` | PASS |
| Full fast gate (3737, 1 skip) at the cycle-8 fix commit | PASS |

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 115 pass
printf '**Verdict**: {PASS / FAIL}\n' | grep -oE 'PASS|FAIL' | head -1   # → PASS (BUG-23)
git show origin/develop:skills/develop-task/SKILL.md | grep -c 'implementation.*.md 2>/dev/null | sort | tail -1'   # → 1 (CR-2 pre-existing)
```

---

## Recommendations

**Immediate (Blocking):** BUG-23 — refuse `{` on the verdict line; exact PASS/FAIL token; placeholder fixture. CR-4 — quote the directory placeholder; `[ -d ]` check with its own HALT.
**Future:** CR-2 with the #145 sweep + an enumeration test over numbered-artefact resolvers; CR-3 once the blocks carry a cwd contract; `qa-cycle.sh --cycle`.

---

## Final Assessment

**Gate Status**: CONCERNS — Rule 2, one MEDIUM, no HIGH. HIGH 1,1,0,1,0,0,0,0,0; MEDIUM 6,3,1,0,4,1,2,2,1. **Quality Score**: 90/100. **Deployment**: CONDITIONAL on BUG-23, CR-4.

**QA Report**: `task.125.qa.9.develop-bug-finalise-mode-and-issue-create.md` · **Gate File**: `task.125.gate.9.develop-bug-finalise-mode-and-issue-create.yml` · **Next Steps**: `/qa-fix` cycle 9 (two small edits); the second grant is then spent.

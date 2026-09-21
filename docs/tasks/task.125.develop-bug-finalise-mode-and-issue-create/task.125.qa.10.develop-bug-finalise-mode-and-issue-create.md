# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.10.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.10.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 10 — the first of a third grant (budget 11) — narrowed to the 2 files the cycle-9 fix touched. The cycle-9 fixes hold on `335559e2` (119 targeted tests). No HIGH. One MEDIUM, and it is a regression of the cycle-9 fix itself: its whole-line `{` check HALTs a correct verdict whose trailing prose names a `{placeholder}` — which this repository's verdict lines routinely do — and the cycle-9 mutation had already shown that arm absorbed by the first-word rule; at the same time the template remnant `PASS / FAIL` with its braces dropped still publishes PASS (BUG-24, both reproduced). Two cleanups taken as LOW: one diagnostic for two states, and refused-verdict tests that assert only exit 1.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T08:56:32Z (gate 9 `updated:`) — 4 files changed since gate 9, 2 reviewable; 1780 diff lines.** `SAFETY_REPROBE=false`. Cycle ≥ 3: narrowed.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-23 placeholder verdict reads as PASS | **FIXED** (residual: BUG-24 — the guard over-reaches and under-reaches) | `{PASS / FAIL}` → HALT; `**PASSED**`, `pending — PASS expected` → HALT; bolded/trailing-prose forms read (executed × 2 shells). |
| CR-4 unquoted directory placeholder | **FIXED** | Missing directory → its own HALT in 6b/7.6a/7.6b (executed × 2 shells). |

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1609` — whole-line brace HALT on a correct verdict; `PASS / FAIL` publishes PASS → **TASK-125-BUG-24** (reviewer CR-1 high + CR-2 medium; both reproduced)
- **[low]** `skills/finalise/SKILL.md:1612` — one diagnostic for "no line" and "line refused" (CR-3)
- **[low]** `evals/shared/tests/finalise-bug-mode.test.mjs:592` — refused cases assert only exit 1 (CR-4)

---

## Testing Scope

- [x] Task document exists; status `ready-for-review`; PR #447 OPEN, head `335559e2`
- [x] 3/3 phases; `npm run ci:fast` 3741/3741 at the cycle-9 fix; `bundle:check` 0
- [x] Automated — 119 targeted; Regression — targeted on head; Security — no new boundary (reasoned)
- [x] Code Review — Step 3b, narrowed (2 files / 1780 lines), Explore reviewer (191 s; 4 findings, the block executed against 10 real develop-bug reports and 8 synthetic verdict lines under both shells; every finding re-verified by QA)
- [x] Manual — 6b executed with `PASS — the \`{bug-prefix}\` reader…` (HALT), `PASS / FAIL` and `PASS/FAIL` (PASS)

Re-review, cycle 10: direct tools + one narrowed reviewer; traceability matrix from cycle 1; `code_review_blocking=true`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | BUG-23 fixed; **BUG-24** (its regression); CR-3, CR-4. |
| Phase 2 | PASS | Unchanged since gate 3. |
| Phase 3 | PASS | Unchanged since gate 6. |

**Overall Phase Completion**: 3/3; 0 FAIL, 1 CONCERNS. SC1 CONCERNS; SC2–SC7 PASS; SC8 PENDING. Breaking changes: none; the no-flag promise holds. **PASS**

---

## Issues Found

### HIGH (0)
### MEDIUM (1)
- **BUG-24** [task.125.bug.24](./task.125.bug.24.whole-line-brace-halt-refuses-a-correct-verdict-with-trailing-prose.md) — over-/under-reaching verdict guard. P2.
### LOW (2 in gate)
- **CR-3** one diagnostic for two states; **CR-4** exit-only assertions.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

Performance PASS · Reliability CONCERNS (BUG-24) · Security PASS (reasoned; cycle-2 measured probe unchanged) · Maintainability PASS.

---

## Code Review

Step 3b, narrowed, 191 s. QA verification: CR-1 and CR-2 reproduced by executing 6b → **BUG-24** (one report: the same line's two seams); CR-3, CR-4 read → low, taken.

**Correctness bugs (2):** CR-1 medium/high, CR-2 low/medium → one gate MEDIUM. **Cleanups (2):** CR-3, CR-4 → gate LOW.

**Provenance:** the cycle-9 fix. **Boundary rule:** `boundary: false`; `probes_executed: 0`; security `reasoned`. **Mutation-proof spot check:** cycle-9's mutations at the fix commit (2 covered, 1 absorbed — the absorbed arm is BUG-24's over-reach); `not-run`. **Working tree:** QA artefacts only.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode`, `gh-labels`, `qa-cycle` (119) on `335559e2` | PASS |
| Full fast gate (3741, 1 skip) at the cycle-9 fix commit | PASS |

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 119 pass
<6b block> with **Verdict**: PASS — the `{bug-prefix}` reader now accepts both shapes   # → HALT (BUG-24 over-reach)
<6b block> with **Verdict**: PASS / FAIL ; PASS/FAIL   # → FINAL_GATE=PASS (BUG-24 under-reach)
```

---

## Recommendations

**Immediate (Blocking):** BUG-24 — drop the whole-line brace check; first-word extraction as the single refusal path; refuse an alternation remainder (`/`, `|`); accepted case with a brace in trailing prose, refused case `PASS / FAIL`. CR-3 — branched diagnostic. CR-4 — per-case diagnostic assertions.
**Future:** as gate 9.

---

## Final Assessment

**Gate Status**: CONCERNS — Rule 2, one MEDIUM, no HIGH. HIGH 1,1,0,1,0,0,0,0,0,0; MEDIUM 6,3,1,0,4,1,2,2,1,1. **Quality Score**: 90/100. **Deployment**: CONDITIONAL on BUG-24, CR-3, CR-4.

**QA Report**: `task.125.qa.10.develop-bug-finalise-mode-and-issue-create.md` · **Gate File**: `task.125.gate.10.develop-bug-finalise-mode-and-issue-create.yml` · **Next Steps**: `/qa-fix` cycle 10 (one line, its tests); cycle 11 re-review.

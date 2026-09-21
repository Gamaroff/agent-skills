# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.11.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.11.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: PASS

---

## Executive Summary

Cycle 11 — the last of the third grant (budget 11) — narrowed to the 2 files the cycle-10 fix touched. The cycle-10 fix holds on `3cd57768`: 119 targeted tests; the reviewer probed the verdict pipeline with 21 line shapes under bash and zsh and executed 6b read-only against three real bug reports. **No correctness finding.** Two low-confidence cleanups are recorded in the gate's future list — a de-braced placeholder *reworded* as `PASS or FAIL` still reads PASS (confirmed: the remainder is `or FAIL`, which the `/`/`|` refusal does not cover), and an unreadable report shares the "no verdict line" HALT. Every `top_issues[]` entry raised across gates 1–10 (24 bug reports, 3 HIGH / 21 MEDIUM, plus the LOWs) has a fix verified on the head by the cycle that followed it. Gate: PASS, empty queue.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Re-review scope: since 2026-09-21T09:13:52Z (gate 10 `updated:`) — 4 files changed since gate 10, 2 reviewable; 1809 diff lines.** `SAFETY_REPROBE=false`. Cycle ≥ 3: narrowed.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-24 verdict guard over-/under-reaches | **FIXED** | 7 refused shapes (`{PASS / FAIL}`, `PASS / FAIL`, `PASS/FAIL`, `PASS\|FAIL`, `pending — PASS expected`, `**PASSED**`, `✅ PASS`) each HALT with the refusing diagnostic; 5 accepted shapes including two with a `{placeholder}` in trailing prose read correctly — executed × 2 shells; the reviewer's 21-shape probe agrees. |
| CR-3 one diagnostic for two states | **FIXED** | "no line found" vs "is not an exact PASS or FAIL: <line>" — asserted per case. |
| CR-4 exit-only assertions | **FIXED** | Every refused case asserts the refusing diagnostic and the absence of the other. |

## New Findings This Cycle

- none at bug severity
- **future** (low/low): CR-1 — `PASS or FAIL` / `PASS, FAIL` rewordings of the placeholder read PASS; CR-2 — an unreadable report and a report with no verdict line reach one HALT

---

## Testing Scope

- [x] Task document exists; status `ready-for-review`; PR #447 OPEN, head `3cd57768`
- [x] 3/3 phases; `npm run ci:fast` 3741/3741 at the cycle-10 fix; `bundle:check` 0
- [x] Automated — 119 targeted; Regression — targeted on head; Security — no new boundary (reasoned; the cycle-2 measured probe stands)
- [x] Code Review — Step 3b, narrowed (2 files / 1809 lines), Explore reviewer (276 s; 2 low-confidence cleanups, the 59 bug-mode tests executed under both shells, the sed pipeline probed with 21 shapes, 6b executed against bug.2/bug.12/bug.15)
- [x] Manual — `PASS or FAIL` remainder confirmed as `or FAIL`

Re-review, cycle 11: direct tools + one narrowed reviewer; traceability matrix from cycle 1; `code_review_blocking=true`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | PASS | Verified | BUG-8/9/12/13/14/15/16/17/18/19/20/21/22/23/24 all fixed and re-verified; two low-confidence residuals in future. |
| Phase 2: tolerant issue create + legible failure | PASS | Verified | BUG-1/2/3/6/10/11 fixed (cycles 1–2); unchanged since gate 3. |
| Phase 3: `fix_cycle` | PASS | Verified | BUG-7, CR-5 (c2), CR-3 (c3), CR-5 (c4), CR-7 (c5) fixed; unchanged since gate 6. |

**Overall Phase Completion**: 3/3 delivered; 0 FAIL, 0 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | PASS | Kind from substituted inputs; every Step 7 block self-binding, placeholder-refusing, in-block branching; artefacts located zsh-safely by number; verdict an exact first word; cycle count from the same block. |
| SC2 Step 7 has no fallback paragraph | PASS | |
| SC3 A label absent from the repo never fails an issue create | PASS | `gh-labels.sh` at nine sites with a population guard. |
| SC4 Any `tracker-issue.js` failure carries gh's first line | PASS | Both spawn paths. |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | PASS | Positive-integer guard, 9-digit cap, rejected value named. |
| SC6 One extra `gh label list` per create | PASS | |
| SC7 Skip list stated once; mutation-proved | PASS | |
| SC8 observations close on merge | PENDING | #65, #69, #122 parked on this PR. |

---

## Breaking Changes Validation

None declared; the "without `--bug` unchanged" promise executed and holding at every cycle. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (0 in gate; 2 future, low confidence)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS — residual (future, low confidence): a reworded placeholder `PASS or FAIL` reads PASS.
### Security — PASS · **Evidence**: reasoned · no new boundary since cycle 2, whose measured probe (20/20) is unchanged since.
### Maintainability — PASS — follow-ups carried: orchestrator path-sort lookups (obs #145), `newest_numbered` hoist, `qa-cycle.sh --cycle`.

---

## Code Review

Step 3b, narrowed (2 files / 1809 lines), 276 s. Findings: CR-1 cleanup low/low (verified — remainder `or FAIL` passes the `/`/`|` refusal) → future; CR-2 cleanup low/low (read) → future. No `category: bug` finding → `top_issues[]` unaffected.

**Correctness bugs (0). Cleanups (2):** advisory, recorded.

**Provenance:** n/a. **Boundary rule:** `boundary: false`; `probes_executed: 0`; security `reasoned`. **Mutation-proof spot check:** cycle-10's three mutations proved at the fix commit (alternation refusal 2 red; brace HALT re-introduced 2 red; diagnostics collapsed 2 red); `not-run` this cycle. **Working tree:** QA artefacts only.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode`, `gh-labels`, `qa-cycle` (119) on `3cd57768` | PASS |
| Full fast gate (3741, 1 skip) at the cycle-10 fix commit | PASS |

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 119 pass on 3cd57768
printf '**Verdict**: PASS or FAIL\n' | sed -E 's/^\*\*Verdict\*\*:[[:space:]]*//' | sed -E 's/^\**[A-Za-z]+\**[[:space:]]*//'   # → "or FAIL" (CR-1, future)
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Cycle-11 CR-1/CR-2 and the carried follow-ups — in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Rule 5 — no entry in `top_issues[]`, every NFR PASS. HIGH 1,1,0,1,0,0,0,0,0,0,0; MEDIUM 6,3,1,0,4,1,2,2,1,1,0. Eleven cycles; every finding executed before it entered a gate and every fix mutation-proved before it left one.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.125.qa.11.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.11.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: Step 5c `/review-pr` (the loop's exit gate), then Step 7 `/finalise`.

# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.7.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.7.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 7 — the last granted cycle (budget 7) — narrowed to the 6 files the cycle-6 fix touched. Every cycle-6 fix holds under re-execution on `ad432c85`: 107 targeted tests; `{bug-prefix}` and `{bug-file-stem}` each defined once; the cycle-count block locates bug.14's full-stem report with no env var and counts 3 under both shells; a verbatim placeholder is refused. No HIGH. Two MEDIUM, both introduced by cycle 6's fixes and both reproduced: the cycle-count block's two-shape `find` runs for every kind, so a parent task picks up its co-located bug's higher-numbered report (BUG-19 — BUG-8 in reverse); the Document-kind block's own placeholders never got the verbatim guard the three later blocks did, so a `--bug` run with them unsubstituted continues as task at exit 0 (BUG-20). Two LOW: the dead `|| echo N/A` (second raise, taken now) and a test-parser slice bound.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T07:55:17Z (gate 6 `updated:`) — 9 files changed since gate 6, 6 reviewable; 1671 diff lines.** `SAFETY_REPROBE=false`. Cycle ≥ 3: narrowed, no refute directive. Second granted cycle.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-18 `{bug-prefix}` defined twice | **FIXED** | `grep -c` → exactly one `{bug-prefix}` (short id, `bug_id`) and one `{bug-file-stem}` (full stem, `bug_stem`) definition; no develop-bug source still says "the filename stem before .md"; definition test + extended enumeration green. |
| CR-2 cycle-count block never binds the report on a bug run | **FIXED** (residual: BUG-19 in task mode) | Block run by hand against `docs/bugs/bug.14` with no env var → `CYCLES=[3]` from the full-stem report, bash + zsh; fixture-directory test green × 2 shells. |
| CR-3 verbatim placeholder passes the guards | **FIXED** (residual: BUG-20 — the kind block) | `case "{story…}task" in *'{'*)` → refused; executed cases for 6b/7.6a/7.6b + the two no-DoD HALTs green × 2 shells. |

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1512` — cycle-count `find` in task mode picks the co-located bug's report → **TASK-125-BUG-19** (reviewer CR-1, reproduced × 2 shells)
- **[medium]** `skills/finalise/SKILL.md:55` — kind block continues as task on verbatim placeholders → **TASK-125-BUG-20** (CR-2, reproduced)
- **[low]** `skills/finalise/SKILL.md:1591` — dead `|| echo "N/A"` in the task branch (CR-3 = cycle-5 CR-9; taken)
- **[low]** `evals/shared/tests/finalise-bug-mode.test.mjs:77` — `parseSkipTable` slice unbounded (CR-4)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review` after qa-fix cycle 6
- [x] 3/3 phases; `npm run ci:fast` 3729/3729 at the cycle-6 fix (1 pre-existing skip); `bundle:check` 0 problems
- [x] Breaking changes: none declared; the no-flag promise holds (executed)
- [x] PR #447 OPEN, head `ad432c85`

### Testing Approach

- [x] Automated Testing — 107 targeted tests on the head
- [x] Regression Testing — targeted suites on the head; fast gate green at the fix commit
- [x] Security Review — no new boundary (reasoned)
- [x] Code Review — Step 3b, narrowed (6 files / 1671 lines), read-only Explore reviewer (265 s; 4 findings, the 47 bug-mode tests executed under both shells, candidates verified by executing the sliced blocks; every finding re-verified by QA)
- [x] Manual Testing — cycle-count block against a real bug dir and a parent-beside-bug fixture × 2 shells; kind block with verbatim placeholders

### Review Methodology

Re-review, cycle 7: direct tools + one narrowed reviewer. Traceability matrix from cycle 1 reused. `code_review_blocking=true`. Step 4b: the new fenced content since gate 6 (the self-binding cycle-count block, the placeholder-refusing guards, the two-shape review lookup) is executed by the suite and by hand above.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | Verified | BUG-18 fixed; **BUG-19**, **BUG-20**; CR-3. |
| Phase 2: tolerant issue create + legible failure | PASS | Verified | Unchanged since gate 3. |
| Phase 3: `fix_cycle` | PASS | Verified | Unchanged since gate 6; duplicated guard stays a follow-up. |

**Overall Phase Completion**: 3/3 delivered; 0 FAIL, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | CONCERNS | The kind block can still continue as task on unsubstituted inputs (BUG-20); a parent's comment can carry its bug's cycle count (BUG-19). |
| SC2 Step 7 has no fallback paragraph | PASS | |
| SC3 A label absent from the repo never fails an issue create | PASS | |
| SC4 Any `tracker-issue.js` failure carries gh's first line | PASS | |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | PASS | |
| SC6 One extra `gh label list` per create | PASS | |
| SC7 Skip list stated once; mutation-proved | PASS | |
| SC8 observations close on merge | PENDING | |

---

## Breaking Changes Validation

None declared; the "without `--bug` unchanged" promise executed and holding. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

- **BUG-19** [task.125.bug.19](./task.125.bug.19.six-a-cycle-count-find-in-task-mode-picks-a-co-located-bugs-report.md) — parent picks its bug's report. P2.
- **BUG-20** [task.125.bug.20](./task.125.bug.20.kind-block-placeholders-left-verbatim-resolve-task-at-exit-0.md) — kind block unguarded. P2.

### LOW Severity Issues (2)

- **CR-3** (in gate) — dead `N/A`.
- **CR-4** (in gate) — unbounded skip-table slice.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS — BUG-19, BUG-20, CR-3 as above.
### Security — PASS · **Evidence**: reasoned · No new boundary; cycle-2 measured probe (20/20) unchanged since.
### Maintainability — PASS — CR-4; the duplicated `fix_cycle` guard remains a follow-up task.

---

## Code Review

Step 3b, narrowed (6 files / 1671 lines), 265 s. QA verification: CR-1 reproduced with `task.67.implementation.1` (1 QA Cycle) beside `task.67.bug.3.implementation.2` (3 Verify Cycles) → `CYCLES=3` from the bug's file, bash + zsh → **BUG-19**; CR-2 reproduced by executing the kind block with both placeholders verbatim and no argv → `DOC_KIND=task`, exit 0 → **BUG-20**; CR-3 read (awk exits 0 on empty input) → low, taken; CR-4 read → low, taken.

**Correctness bugs (2):** CR-1, CR-2 medium/high → gate MEDIUM.
**Cleanups (2):** CR-3, CR-4 → gate LOW (taken this cycle rather than carried again).

**Provenance:** BUG-19 introduced by the cycle-6 CR-2 fix; BUG-20 is the cycle-6 CR-3 guard applied to three of four blocks. Both this branch's.

**Boundary rule:** `boundary: false`; `probes_executed: 0`; security evidence `reasoned`.

**Mutation-proof spot check (Step 3c):** the cycle-6 fixes' six mutations were proved at the fix commit; the head is that commit; `not-run` this cycle.

**Working tree:** QA artefacts only; the implementation report as at the start of this step.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode.test.mjs`, `gh-labels.test.js`, `qa-cycle.test.js` (107) on `ad432c85` | PASS |
| Full fast gate (3729, 1 skip) at the cycle-6 fix commit | PASS |

---

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 107 pass on ad432c85
<6a cycle-count block> with STEM=bug.14, DIR=docs/bugs/bug.14.* under bash|zsh   # → CYCLES=[3] (CR-2 fixed)
<6a cycle-count block> with STEM=task.67 beside task.67.bug.3.implementation.2.* under bash|zsh   # → CYCLES=[3] from the BUG's report (BUG-19)
<Document-kind block> with BUG_FLAG/DOC_FILE verbatim, no argv   # → DOC_KIND=[task] exit 0 (BUG-20)
grep -c '`{bug-prefix}` is the **short id**' …step-0-resolve-bug.md   # → 1 (BUG-18 fixed)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-19 — bind `DOC_KIND` in the cycle-count block; full-stem pattern only in bug mode; parent-beside-bug case. BUG-20 — verbatim guard in the kind block + executed case.
2. CR-3 — explicit gate-path check in 6b's task branch. CR-4 — bound the skip-table slice.

### Short-term Actions (Non-Blocking)
1. Follow-up task: `qa-cycle.sh --cycle` for the duplicated `fix_cycle` guard.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 2 — two MEDIUM, no HIGH. HIGH 1 → 1 → 0 → 1 → 0 → 0 → 0; MEDIUM 6 → 3 → 1 → 0 → 4 → 1 → 2. Both MEDIUMs are one-block residues of cycle 6's fixes, each with a two-line remedy the surrounding blocks already carry.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-19, BUG-20, CR-3, CR-4.

---

**QA Report**: co-located at `task.125.qa.7.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.7.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 7; the budget (7) is then spent — a further grant is needed to gate that fix.

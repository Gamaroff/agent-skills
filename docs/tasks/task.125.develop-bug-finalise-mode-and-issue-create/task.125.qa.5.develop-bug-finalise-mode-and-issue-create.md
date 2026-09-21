# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.5.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.5.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 — the budget cycle — narrowed to the 5 files changed since gate 4. Every cycle-4 fix holds under re-execution on the committed head (`24423428`): the two-shape `find` and the bare-token verdict extraction resolve `bug.14` (full stem), `bug.12` (short) and `bug.1` (full stem) under bash and zsh; 83 targeted tests green. No HIGH. Four MEDIUM remain, all in the finalise bug path and all of one family — a fenced block whose correctness depends on something outside the block: the two-shape lookup orders by path, so an older full-stem report beats a newer short one (reproduced); 6b reads `STEM` bound in 6a and, with it unset, publishes an empty DoD path and gate at exit 0 (reproduced; the test injects it); 7.6a's `git add` and 7.6b's `status: accepted` assertion HALT verbatim on a bug run with the bug variant only in marker prose; the "both shapes" contract was applied by hand and missed the cycle count (`### QA Cycle` vs the bug reports' `### Verify Cycle`). Three LOW ride in the queue; two cleanups are advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T06:22:33Z (gate 4 `updated:`) — 9 files changed since gate 4, 5 reviewable after excluding task documents; 1316 diff lines.** `SAFETY_REPROBE=false` (gate 4 security `PASS reasoned`). Cycle ≥ 3: narrowed scope, no refute directive.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-13 report glob keyed on the short id | **FIXED** (with a residual: BUG-14 ordering) | The committed `find` run by hand against `docs/bugs/bug.14` (full stem), `bug.12` (short) and `bug.1` (full stem) under bash + zsh — every one found, verdict `PASS` as a bare token. Full-stem fixture case green × 2 shells. |
| CR-3 raw `**PASS**` token | **FIXED** | `bug.12`'s bolded line → `PASS`; the neither-token case HALTs (executed). |
| CR-2 `$*`-only kind check | **FIXED** (residual: CR-6 asymmetry; design: cycle-5 CR-3) | Bug STEM without `--bug` → HALT exit 1 (executed × 2 shells). |
| CR-4 tracker-block indentation | **FIXED** | Read. |
| CR-5 literal `fix_cycle=0` | **FIXED** | `FIX_CYCLE_ARG=000` → `fix_cycle='000' is not a positive cycle` (executed × 2 shells); the 8 invalid-arg cases assert the verbatim value. |

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1510` — two-shape lookup sorts by path; older full-stem beats newer short → **TASK-125-BUG-14** (reviewer CR-1, reproduced by QA)
- **[medium]** `skills/finalise/SKILL.md:1481` — `STEM` bound in another block; unset → blank comment at exit 0 → **TASK-125-BUG-15** (CR-2, reproduced × 2 shells)
- **[medium]** `skills/finalise/SKILL.md:1199` — 7.6a `git add` / 7.6b `status: accepted` assertion HALT verbatim in bug mode; bug variant in prose → **TASK-125-BUG-16** (CR-4, reviewer medium confidence, verified by reading the blocks against their markers)
- **[medium]** `skills/develop-bug/SKILL.md:341` — no population check on "every reader accepts both shapes"; 6a counts `### QA Cycle`, bug reports write `### Verify Cycle` (25/0) → **TASK-125-BUG-17** (CR-5, verified by grep; the `exclude=` half is weaker than reported — the `git reset` beside it covers both shapes)
- **[low]** CR-3 `$*` is the only source of `--bug` and no prose says how a Bash-tool block receives it (reviewer medium; QA-held low — pre-dating mechanism, loud HALT; fold into the BUG-15 placeholder design)
- **[low]** CR-6 cross-check asymmetric (`--bug` + parent STEM → parent's verdict)
- **[low]** CR-7 `10#` wraps past 19 digits (`18446744073709551617` → 1, reproduced); the helper caps at 9
- cleanups: CR-8 duplicated fix_cycle guard; CR-9 task-branch `|| echo N/A` never emits (awk succeeds on empty input)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review` after qa-fix cycle 4
- [x] 3/3 phases; tests passing (`npm run ci:fast` 3705/3705 at the cycle-4 fix, 1 pre-existing skip); `bundle:check` 0 problems
- [x] Breaking changes: none declared; the no-flag promise holds (executed)
- [x] PR #447 OPEN, head `24423428`

### Testing Approach

- [x] Automated Testing — 83 targeted tests on the head (`finalise-bug-mode`, `gh-labels`, `qa-cycle`)
- [x] Regression Testing — targeted suites on the head; the fast gate was green at the fix commit and the head is unchanged
- [x] Security Review — no new boundary this cycle (reasoned)
- [x] Code Review — Step 3b, narrowed diff (5 files / 1316 lines), read-only Explore reviewer (341 s; 9 findings — the reviewer executed the extracted 6b block under bash + zsh and ran both test files itself; every finding re-verified by QA)
- [x] Manual Testing — `find` + verdict extraction against three real bug directories × 2 shells; 6b with `STEM` unset × 2 shells; CR-1 fixture; CR-7 arithmetic

### Review Methodology

Re-review, cycle 5: direct tools + one narrowed reviewer. Traceability matrix from cycle 1 reused. `code_review_blocking=true`. Step 4b: the only new fenced content since gate 4 is the 6b `find`/`grep -oE`/`case "$STEM"` lines and the two guard arms, all executed above.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | Verified | BUG-13 fixed; **BUG-14/15/16/17** remain; CR-3, CR-6 low. |
| Phase 2: tolerant issue create + legible failure | PASS | Verified | Unchanged since gate 3. |
| Phase 3: `fix_cycle` | PASS (cleanups) | Verified | CR-7 low; CR-8 cleanup. |

**Overall Phase Completion**: 3/3 delivered; 0 FAIL, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | CONCERNS | 7.6a/7.6b HALT verbatim (BUG-16); 6b blank on unbound STEM (BUG-15); stale report ordering (BUG-14); cycle count 0 (BUG-17). |
| SC2 Step 7 has no fallback paragraph | PASS | |
| SC3 A label absent from the repo never fails an issue create | PASS | |
| SC4 Any `tracker-issue.js` failure carries gh's first line | PASS | |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | PASS | CR-7 low. |
| SC6 One extra `gh label list` per create | PASS | |
| SC7 Skip list stated once; mutation-proved | PASS | |
| SC8 observations close on merge | PENDING | |

---

## Breaking Changes Validation

None declared; the "without `--bug` unchanged" promise executed and holding. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (4)

- **BUG-14** [task.125.bug.14](./task.125.bug.14.six-b-report-lookup-sorts-lexically-older-full-stem-report-wins.md) — lexical ordering across shapes. P2.
- **BUG-15** [task.125.bug.15](./task.125.bug.15.six-b-reads-stem-bound-in-another-block-empty-stem-publishes-silently.md) — `STEM` from another block; blank publish. P2.
- **BUG-16** [task.125.bug.16](./task.125.bug.16.six-a-git-add-and-six-b-accepted-assertion-halt-verbatim-on-a-bug-run.md) — 7.6a/7.6b bug variant in prose. P2.
- **BUG-17** [task.125.bug.17](./task.125.bug.17.both-report-shapes-contract-has-no-population-check-cycle-count-reads-qa-cycle.md) — no population check; cycle-count heading. P2.

### LOW Severity Issues (5)

- **CR-3** (in gate) — `$*` as the flag's only source; no invocation prose.
- **CR-6** (in gate) — asymmetric cross-check.
- **CR-7** (in gate) — `10#` overflow past 19 digits.
- **CR-8** (advisory) — duplicated guard.
- **CR-9** (advisory) — `N/A` never emitted.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 5

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS — BUG-14..17 as above.
### Security — PASS · **Evidence**: reasoned · No new boundary; cycle-2 measured probe (20/20) unchanged since.
### Maintainability — PASS — CR-8/9 for a fix cycle.

---

## Code Review

Step 3b, narrowed (5 files / 1316 lines), 341 s; the reviewer executed the extracted 6b block under bash + zsh and ran both test files. QA verification: CR-1 reproduced with a two-shape fixture (`…implementation.1.old.md` wins) → **BUG-14**; CR-2 reproduced by running 6b with `STEM` unset under bash + zsh (`DOD_PATH=[] FINAL_GATE=[] DOC_KIND=[task]`, exit 0) → **BUG-15**; CR-4 verified by reading 1199/1257 against the markers at 1232/1263 → **BUG-16** (QA-owned; reviewer medium confidence); CR-5 verified by grep (25 `### Verify Cycle`, 0 `### QA Cycle` across real bug reports; the `exclude=` half partially covered by the `git reset`) → **BUG-17**; CR-3 read against the kind block → low; CR-6 read → low; CR-7 reproduced (`$((10#18446744073709551617))` → 1) → low; CR-8/9 read and accepted as cleanups (CR-9's "awk succeeds on empty input" confirmed).

**Correctness bugs (7):** CR-1, CR-2, CR-5 medium/high → gate MEDIUM; CR-4 medium/medium → gate MEDIUM after QA verification; CR-3 medium/medium → gate LOW (QA-held); CR-6, CR-7 low/medium → gate LOW.
**Cleanups (2):** CR-8, CR-9 — advisory.

**Provenance:** BUG-14 and BUG-17 are introduced by the cycle-4 fix; BUG-15 and BUG-16 are in the `finalise --bug` path this branch adds (base `origin/develop` has no bug mode). Not pre-existing.

**Boundary rule:** `boundary: false` — no accept/reject function in the diff; `probes_executed: 0`, security evidence `reasoned`.

**Mutation-proof spot check (Step 3c):** the cycle-4 fixes' mutations were proved at the fix commit (2/4/2/3 red) and the head is unchanged since; `not-run` this cycle. For BUG-15 the observation is the inverse: the fixture injects `STEM`, so an unbound `STEM` cannot go red — `no-red-untested`.

**Working tree:** QA artefacts only — no fix applied; `git status --porcelain` as at the start of this step (the implementation report only).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode.test.mjs`, `gh-labels.test.js`, `qa-cycle.test.js` (83) on `24423428` | PASS |
| Full fast gate (3705, 1 skip) at the cycle-4 fix commit; head unchanged | PASS |

---

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 83 pass on 24423428
for sh in bash zsh; do for STEM in bug.14 bug.12 bug.1; do $sh -c '… find $D -maxdepth 1 \( -name "$STEM.implementation.*.md" -o -name "$STEM.*.implementation.*.md" \) … grep -oE "PASS|FAIL" …'; done; done   # all found, PASS
D=$(mktemp -d); touch "$D/bug.14.precompact-hook.implementation.1.old.md" "$D/bug.14.implementation.2.new.md"; find "$D" … | sort | tail -1   # → implementation.1.old.md (BUG-14)
env -i PATH="$PATH" DIR="$D" bash|zsh -s -- < sixb.sh   # STEM unset → DOD_PATH=[] FINAL_GATE=[] DOC_KIND=[task], rc 0 (BUG-15)
grep -h -oE '^### (QA|Verify) Cycle' docs/bugs/*/*.implementation.*.md | sort | uniq -c   # 25 Verify Cycle (BUG-17)
bash -c 'X=18446744073709551617; echo $((10#$X))'   # → 1 (CR-7)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-14 — order by `.implementation.{N}.` at every site; two-shapes-coexist case. BUG-15 — re-bind `STEM` in 6b as a placeholder + non-vacuity HALT; STEM-unset case (carry the kind the same way — CR-3). BUG-16 — in-block bug branches for 7.6a/7.6b with executed bug-mode cases. BUG-17 — enumeration test with a floor; widen the 6a grep and the `exclude=`.
2. CR-6 symmetric HALT; CR-7 9-digit cap.

### Short-term Actions (Non-Blocking)
1. CR-8 one definition for the fix_cycle guard; CR-9 explicit `N/A`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 2 — four MEDIUM, no HIGH. The HIGH sequence across gates is 1 → 1 → 0 → 1 → 0; MEDIUM 6 → 3 → 1 → 0 → 4. This is cycle 5 of 5: the loop's budget ends on this cycle's fix, and the gate-the-last-fix half-cycle cannot be granted (HIGH was seen at cycles 1, 2 and 4), so the pipeline escalates after 5b per Loop Escalation.
**Quality Score**: 60/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-14..17 with executed cases; CR-3, CR-6, CR-7.

---

**QA Report**: co-located at `task.125.qa.5.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.5.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 5 over BUG-14..17 + CR-3/6/7; then Loop Escalation (loop limit) hands the residual and its evidence to a person.

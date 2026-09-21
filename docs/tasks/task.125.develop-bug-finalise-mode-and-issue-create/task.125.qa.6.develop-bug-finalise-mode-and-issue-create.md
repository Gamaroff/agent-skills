# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.6.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.6.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 6 — the first of two granted cycles (budget 7) — narrowed to the 6 files the cycle-5 fix touched. Every cycle-5 fix holds under re-execution on the committed head (`156efdad`): 102 targeted tests; the numeric report ordering picks `implementation.2` over an older full-stem `implementation.1` under bash and zsh; a real bug report counts 3 `Verify Cycle` headings; a 20-digit `fix_cycle` is refused before the arithmetic. No HIGH. One MEDIUM, and it is the root under BUG-13/14/17: `{bug-prefix}` is **defined twice** — develop-bug's Step 0 returns the full filename stem, everything else (SKILL.md:184, finalise's `STEM`, `bug-doc.js` `bug_id`, the cycle-5 note) means the short id — so the corpus carries `.review.` and `.implementation.` files in both shapes and `.dod.` files in one, and the both-shapes contract was applied to readers while the definition they key on stayed split. Two LOW: the cycle-count block never binds the report on a bug run (`CYCLES=0` always); the new non-vacuity guards accept an unsubstituted placeholder. One cleanup (the duplicated `fix_cycle` guard, raised for the second time) is advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T06:51:37Z (gate 5 `updated:`) — 8 files changed since gate 5, 6 reviewable after excluding task documents; 1748 diff lines.** `SAFETY_REPROBE=false` (gate 5 security `PASS reasoned`). Cycle ≥ 3: narrowed scope, no refute directive. Loop re-entered after the loop-limit halt with 2 granted cycles (`qa_max_cycles: 7`).

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-14 lexical ordering across shapes | **FIXED** | `find … \| sed \| sort -n \| cut` run by hand with `bug.14.precompact-hook.implementation.1.*` beside `bug.14.implementation.2.*` → `implementation.2` under bash + zsh; executed case green × 2 shells. |
| TASK-125-BUG-15 `STEM` from another block | **FIXED** (residual: CR-3 placeholder) | 6b/7.6a/7.6b re-bind `STEM` + `DOC_KIND` as placeholders; STEM-unset → HALT executed × 2 shells for all three blocks. |
| TASK-125-BUG-16 7.6a/7.6b bug variant in prose | **FIXED** | Both blocks branch in-block; executed bug/task cases for artefact lists, commit message and final assertion. |
| TASK-125-BUG-17 no population check; `### QA Cycle` only | **FIXED** (residual: CR-2 — the block never locates a bug's report; root: BUG-18) | `grep -cE '^### (QA\|Verify) Cycle'` on a real bug report → 3; enumeration test green (≥ 4 sites); `exclude=` both shapes. |
| CR-3 `$*` flag source | **FIXED** | Kind block `BUG_FLAG` placeholder; executed no-argv case. |
| CR-6 asymmetric cross-check | **FIXED** | Parent STEM + bug kind → HALT (executed). |
| CR-7 `10#` overflow | **FIXED** | `18446744073709551617` refused by the 9-digit arm (executed); 2 new invalid-arg cases. |

## New Findings This Cycle

- **[medium]** `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:22` — `{bug-prefix}` defined as the full stem here, the short id everywhere else → **TASK-125-BUG-18** (reviewer CR-1, verified by reading both definitions and the corpus)
- **[low]** `skills/finalise/SKILL.md:1500` — cycle-count block reads `$IMPLEMENTATION_REPORT` that no bug run binds (CR-2)
- **[low]** `skills/finalise/SKILL.md:1529` — `[ -n … ]` guards accept a verbatim placeholder (CR-3, executed)
- cleanup: duplicated `fix_cycle` guard, one copy executed (CR-4 = cycle-5 CR-8)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review` after qa-fix cycle 5
- [x] 3/3 phases; tests passing (`npm run ci:fast` 3724/3724 at the cycle-5 fix, 1 pre-existing skip); `bundle:check` 0 problems
- [x] Breaking changes: none declared; the no-flag promise holds (executed)
- [x] PR #447 OPEN, head `156efdad`

### Testing Approach

- [x] Automated Testing — 102 targeted tests on the head (`finalise-bug-mode`, `gh-labels`, `qa-cycle`)
- [x] Regression Testing — targeted suites on the head; the fast gate was green at the fix commit and the head differs only by the implementation report
- [x] Security Review — no new boundary this cycle (reasoned)
- [x] Code Review — Step 3b, narrowed diff (6 files / 1748 lines), read-only Explore reviewer (319 s; 4 findings — the reviewer executed all 42 bug-mode tests under both shells and re-ran the blocks by hand for zsh nomatch and placeholder cases; every finding re-verified by QA)
- [x] Manual Testing — BUG-14 ordering, BUG-17 count, CR-7 refusal, CR-3 placeholder pass-through

### Review Methodology

Re-review, cycle 6: direct tools + one narrowed reviewer. Traceability matrix from cycle 1 reused. `code_review_blocking=true`. Step 4b: the new fenced content since gate 5 (placeholders, in-block branches, the sort key, the digit cap) is executed by the suite named above.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | Verified | BUG-14..17 fixed; **BUG-18** (prefix defined twice); CR-2 (cycle count unbound on a bug run); CR-3 (placeholder passes the guard). |
| Phase 2: tolerant issue create + legible failure | PASS | Verified | Unchanged since gate 3. |
| Phase 3: `fix_cycle` | PASS (cleanup) | Verified | CR-7 fixed; CR-4 duplicated guard advisory. |

**Overall Phase Completion**: 3/3 delivered; 0 FAIL, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | CONCERNS | The blocks now self-bind and branch; the prefix they key on has two definitions (BUG-18); the cycle count is 0 on a bug run (CR-2). |
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

### MEDIUM Severity Issues (1)

- **BUG-18** [task.125.bug.18](./task.125.bug.18.bug-prefix-has-two-definitions-full-stem-in-step-0-short-id-everywhere-else.md) — `{bug-prefix}` defined twice. P2.

### LOW Severity Issues (3)

- **CR-2** (in gate) — cycle-count block never binds the report on a bug run.
- **CR-3** (in gate) — verbatim placeholder passes the `-n` guard.
- **CR-4** (advisory) — duplicated `fix_cycle` guard (= cycle-5 CR-8); follow-up task.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS — BUG-18, CR-2, CR-3 as above.
### Security — PASS · **Evidence**: reasoned · No new boundary; cycle-2 measured probe (20/20) unchanged since.
### Maintainability — PASS — CR-4 as a follow-up task.

---

## Code Review

Step 3b, narrowed (6 files / 1748 lines), 319 s; the reviewer executed the 42 bug-mode tests under both shells and re-ran the blocks by hand. QA verification: CR-1 confirmed by reading `develop-bug-step-0-resolve-bug.md:22` (full stem, `bug.7.stale-token`) against `SKILL.md:184`, finalise 6a and `bug-doc.js`, and by the corpus (`find docs -name '*bug*.review.*'` → both shapes; `.dod.` → short only) → **BUG-18**; CR-2 confirmed by grep (`IMPLEMENTATION_REPORT=` bound only in 6b, the next block) → low; CR-3 confirmed by executing `[ -n "{story…}" ]` → passes → low; CR-4 read → cleanup, second raise.

**Correctness bugs (3):** CR-1 medium/high → BUG-18 (gate MEDIUM); CR-2 low/medium → gate LOW; CR-3 low/medium → gate LOW.
**Cleanups (1):** CR-4 — advisory (follow-up task recommended).

**Provenance:** BUG-18's split predates this branch (step-0 line 22 is on `origin/develop`), but this branch's finalise bug mode and its cycle-4/5 fixes are what made the two meanings collide — the short-form assertion at `SKILL.md:344` is this branch's. Owned here because the branch's own contract ("every reader accepts both shapes") is unenforceable while the definition is split. CR-2 and CR-3 are introduced by the cycle-5 fix.

**Boundary rule:** `boundary: false`; `probes_executed: 0`; security evidence `reasoned`.

**Mutation-proof spot check (Step 3c):** the cycle-5 fixes' nine mutations were proved at the fix commit and the head differs only by the implementation report; `not-run` this cycle.

**Working tree:** QA artefacts only — no fix applied; `git status --porcelain` as at the start of this step (the implementation report only).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode.test.mjs`, `gh-labels.test.js`, `qa-cycle.test.js` (102) on `156efdad` | PASS |
| Full fast gate (3724, 1 skip) at the cycle-5 fix commit | PASS |

---

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 102 pass on 156efdad
for sh in bash zsh; do $sh -c 'find "$D" -maxdepth 1 \( … \) | sed -E "s/^(.*\.implementation\.)([0-9]+)(\..*)$/\2 \1\2\3/" | sort -n | tail -1 | cut -d" " -f2-'; done   # → implementation.2.new.md (BUG-14)
CYCLES=$(grep -cE '^### (QA|Verify) Cycle' docs/bugs/bug.14.*/bug.14.*.implementation.1.*.md || true); echo "${CYCLES:-0}"   # → 3 (BUG-17)
case 18446744073709551617 in ??????????*) echo rejected;; esac   # → rejected (CR-7)
grep -n 'bug-prefix' skills/develop-bug/references/develop-bug-step-0-resolve-bug.md   # line 22: full stem (BUG-18)
STEM="{story.{epic}.{story} | task.{id}}"; [ -n "$STEM" ] && echo passes   # → passes (CR-3)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-18 — one definition (short id) + `{bug-file-stem}` for the bug-file links; two-shape `find` for the review globs; enumeration test covers the definition line and `.review.*` readers.
2. CR-2 — cycle-count block self-binding (derive the report in-block when the env var is empty). CR-3 — guards refuse `{`; empty `DOD_PATH` HALTs.

### Short-term Actions (Non-Blocking)
1. CR-4 — `qa-cycle.sh --cycle <arg>` so both qa-fix blocks share one validation (follow-up task).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 2 — one MEDIUM, no HIGH. HIGH sequence 1 → 1 → 0 → 1 → 0 → 0; MEDIUM 6 → 3 → 1 → 0 → 4 → 1. The cycle-5 family (blocks depending on something outside themselves) is closed; what remains is the definition those blocks key on.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-18, CR-2, CR-3.

---

**QA Report**: co-located at `task.125.qa.6.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.6.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 6 over BUG-18 + CR-2/CR-3; cycle 7 (the last granted) re-review narrowed.

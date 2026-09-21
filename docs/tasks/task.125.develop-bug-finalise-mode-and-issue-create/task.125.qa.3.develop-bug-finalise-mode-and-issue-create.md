# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.3.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.3.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3, narrowed to the 14 files changed since gate 2. Every cycle-2 fix holds under re-execution on the committed head (`a246f4ae`); the suite is 3693/3693. No HIGH remains. One MEDIUM survives, of the class this pipeline keeps finding in runnable prose: the new 6b bug branch keys on two variables — `DOC_KIND`, assigned in another fenced block, and `VERIFY_VERDICT`, assigned by no command anywhere — and the executed fixture test injects both, so it proves the happy path only. Two LOWs (a PR body line that claims `status: accepted` on a bug run; a silently cleared invalid `fix_cycle`) and two cleanups.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

**Re-review scope: since 2026-09-21T05:35:38Z (default) — 31 files changed since gate 2, 14 reviewable after excluding bundled copies and task documents; 2060 diff lines.** `SAFETY_REPROBE=false` (gate 2 security `OK measured`).

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-8 7.7 globs publish the parent's DoD/gate | **FIXED** (with a residual: BUG-12) | 6b fixture test executed on head: bug mode → the bug's DoD + `PASS`; task mode → the parent's. The derivation is correct *when its inputs are bound* — see BUG-12. |
| TASK-125-BUG-9 Step 2 reads the parent's QA record | **FIXED** | Marker scopes both globs to `${STEM}`; test asserts it. |
| TASK-125-BUG-10 `--remove-label` undefined / verbatim compare | **FIXED** | `[remove-label]` ×3 executed with a fake gh on head: High vs `priority:high` → no removal; medium → high → removes medium; dropped label → no removal. `grep -vxF -- "${NEW_PRIORITY:-__none__}"` re-run by hand with an empty `NEW_PRIORITY` → returns the old label (correct). |
| TASK-125-BUG-11 fixed `epic` label outside the helper/guard | **FIXED** | Guard green at 9 sites; ensure-epic + create-issue source the helper; 9 bundled copies. |
| CR-5 `00` passes the guard | **FIXED** | `10#` normalisation run by hand under bash and zsh: `007→7`, `00→∅`, `000→∅`, `0→∅`, `08→8`, `09→9` — identical; 4 new cases green. |
| CR-6 / CR-7 / CR-8 | FIXED | Header count removed; comment names the `source` line; `indexOf > -1` asserted. |

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1480` — 6b keys on `$DOC_KIND` / `$VERIFY_VERDICT`; no command binds `VERIFY_VERDICT` (`grep 'VERIFY_VERDICT='` → nothing); the fixture test injects both via env → **TASK-125-BUG-12** (reviewer CR-1, verified by QA)
- **[low]** `skills/finalise/SKILL.md:1507` — the PR body's "commit carrying `status: accepted`" / "Story/task accepted" lines are unconditional on a bug run (CR-2)
- **[low]** `skills/qa-fix/SKILL.md:867` — an invalid `fix_cycle` is cleared silently; "not supplied" and "malformed" resolve to one message (CR-3)
- cleanups: the guard regex admits `--label 'x'` / `--label $X` / same-line forms and scans `skills/*/SKILL.md` only (CR-4); the verify-loop invocation-string test is a grep of prose presented as a runtime property (CR-5)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review` after qa-fix cycle 2
- [x] 3/3 phases; tests passing (`npm run ci:fast` 3693/3693); `bundle:check` 0 problems
- [x] Breaking changes: none declared; the no-flag promise holds (executed)
- [x] PR #447 OPEN, head `a246f4ae`

### Testing Approach

- [x] Automated Testing — 77 targeted tests on the head; full fast gate
- [x] Regression Testing — fast gate; bundle check; shellcheck clean on the helper
- [x] Security Review — no new boundary this cycle (reasoned; the label boundary's cycle-2 probe stands)
- [x] Code Review — Step 3b, narrowed diff, read-only Explore reviewer (347 s; 5 findings, verified — and executed the guard + label derivation under `/bin/bash` 3.2, bash 5.3 and zsh itself)
- [x] Manual Testing — `10#` and the empty-`NEW_PRIORITY` grep re-run by hand in both shells

### Review Methodology

Re-review, cycle 3: direct tools + one narrowed reviewer. Traceability matrix from cycle 1 reused. `code_review_blocking=true`. Step 4b: the prose files in scope are the same nine as cycle 2 and were executed there; the only new fenced content (the 6b `DOC_KIND` branch, the `REMOVE_ARGS` derivation, the `10#` case arm) is covered by the executing tests named above.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | CONCERNS | Verified | BUG-8/9 fixed; **BUG-12** (6b inputs unbound in-block; test injects them); CR-2 (body lines). |
| Phase 2: tolerant issue create + legible failure | PASS | Verified | BUG-1/2/3/6/10/11 hold; helper at nine sites; guard green. CR-4 is a guard-breadth cleanup. |
| Phase 3: `fix_cycle` | CONCERNS (low) | Verified | BUG-7 + CR-5 hold; CR-3 (silent clear). |

**Overall Phase Completion**: 3/3 delivered; 0 FAIL, 2 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | CONCERNS | Derivations keyed on the stem and executed; BUG-12 leaves the bug branch's inputs unbound in-block; CR-2 body text. |
| SC2 Step 7 has no fallback paragraph | PASS | |
| SC3 A label absent from the repo never fails an issue create | PASS | Nine sites through the helper; fixed labels included; remove-label defined. |
| SC4 Any `tracker-issue.js` failure carries gh's first line | PASS | Both spawn paths. |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | PASS (CR-3 low) | |
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

- **BUG-12** [task.125.bug.12](./task.125.bug.12.six-b-bug-branch-inputs-unbound-in-block-and-test-injects-them.md) — 6b's bug branch reads `DOC_KIND` and `VERIFY_VERDICT` that no command binds in that block; the fixture test injects them. P2.

### LOW Severity Issues (4)

- **CR-2** (in gate) — PR body lines claim `status: accepted` on a bug run.
- **CR-3** (in gate) — invalid `fix_cycle` cleared silently; message says "no fix_cycle arg".
- **CR-4** (advisory) — guard regex breadth and scanned population.
- **CR-5** (advisory) — grep-of-prose test titled as a runtime property.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS — BUG-12, CR-2, CR-3 as above.
### Security — PASS · **Evidence**: reasoned · No new boundary; cycle-2 measured probe (20/20) unchanged since.
### Maintainability — PASS — helper + guard + executed tests; CR-4/5 for the fix cycle.

---

## Code Review

Step 3b, narrowed (14 files / 2060 lines), 347 s; the reviewer executed the guard and the label derivation under three shells itself. QA verification: CR-1 confirmed by grep (no `VERIFY_VERDICT=` anywhere) and by reading the test's `env` injection → **owned as BUG-12**; CR-2 confirmed at lines 1507/1510; CR-3 confirmed by reading both arms; CR-4/5 read and accepted as cleanups.

**Correctness bugs (3):** CR-1 medium/medium → BUG-12; CR-2 low/high → gate low; CR-3 low/medium → gate low.
**Cleanups (2):** CR-4, CR-5 — advisory.

**Mutation-proof spot check (Step 3c):** re-run for the two fixes this gate's verdict most depends on — 6b directory glob restored → 2 red (**covered**); remove-label compared against the verbatim value → 1 red (**covered**). The `10#` normalise dropped → 4 red (**covered**, re-run). Others `not-run` this cycle.

**Provenance:** BUG-12 is introduced by this diff (cycle 2's fix). **Working tree:** QA artefacts only — no fix applied.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full fast gate (3693) / bundle check / shellcheck | PASS |
| `tracker-issue.test.mjs`, `registry-tick.test.mjs`, `qa-cycle.test.js` existing guards | PASS |

---

## Test Commands Executed
```bash
npm run ci:fast                                   # 3693 pass / 0 fail
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js tests/ensure-bug-label-tolerance.test.js   # 77 pass on a246f4ae
bash|zsh -c '… case … 10# …'                       # 007/00/000/0/12/08/09 — identical in both shells
printf 'bug\npriority:medium\n' | grep '^priority:' | grep -vxF -- "${EMPTY:-__none__}"   # → priority:medium
grep -n 'VERIFY_VERDICT=' skills/finalise/SKILL.md   # → nothing (BUG-12)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-12 — bind `DOC_KIND` and `VERIFY_VERDICT` in the 6b block; HALT in bug mode on an empty verdict; make the fixture test run without injecting them (+ the no-flag → task-branch case). P2.
2. CR-2 — branch the two body lines on `DOC_KIND`. CR-3 — warn on a rejected `fix_cycle` value.

### Short-term Actions (Non-Blocking)
1. CR-4 guard breadth; CR-5 test title.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 2 — one MEDIUM, no HIGH. The HIGH sequence across gates is 1 → 1 → 0; the loop is converging.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-12 with a non-injecting executed test; CR-2, CR-3.

---

**QA Report**: co-located at `task.125.qa.3.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.3.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 3 over BUG-12 + CR-2..5; cycle-4 re-review narrowed.

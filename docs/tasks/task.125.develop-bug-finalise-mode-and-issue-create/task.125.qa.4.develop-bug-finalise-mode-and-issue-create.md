# QA Report: Task 125 - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Task**: [Link to task document](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Gate File**: [task.125.gate.4.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.4.develop-bug-finalise-mode-and-issue-create.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: FAIL

---

## Executive Summary

Cycle 4, narrowed to the 5 files changed since gate 3. Every cycle-3 fix holds under re-execution on the committed head (`a1d13b19`): the 6b block run with only `DIR`, `STEM` and argv bound, under bash and zsh, takes the bug branch on `--bug`, the parent's gate without it, and HALTs on a missing verdict; 75 targeted tests green. The cycle-3 fix introduced one HIGH of its own: the new in-block verdict derivation globs `${STEM}.implementation.*.md` on the **short** bug id, and develop-bug's three most recent real runs (bug.13/14/15) named the report with the **full** filename stem — executed against `docs/bugs/bug.14`, the glob is empty and the new HALT fires on a run that has a verdict. The fixture test names its report in the short shape and is green on a shape the pipeline no longer produces. Two LOW ride in the queue (the same `awk` publishes `**PASS**` with its asterisks — 9 of 25 real verdict lines are bolded; 6b's kind check reads `$*` with no cross-check against the bound `STEM`) and two cleanups are advisory.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

**Re-review scope: since 2026-09-21T05:57:31Z (gate 3 `updated:`) — 5 files changed since gate 3, 1549 diff lines.** `SAFETY_REPROBE=false` (gate 3 security `PASS reasoned`, no safety-axis failure). Cycle ≥ 3: narrowed scope, no refute directive.

| Previous issue | Status | How verified this cycle |
| --- | --- | --- |
| TASK-125-BUG-12 6b inputs unbound in-block; test injects them | **FIXED** (with a residual: BUG-13) | 6b executed from the committed block with nothing injected but `DIR`/`STEM`/argv, under bash + zsh: `--bug` → `KIND=bug GATE=PASS DOD=bug's`; no flag → `KIND=task GATE=FAIL DOD=parent's`; `--bug` + no `**Verdict**` line → HALT exit 1. The derivation is correct *for the report shape the fixture names* — see BUG-13. |
| CR-2 PR body claims `status: accepted` on a bug run | **FIXED** | `HEAD_DESC` / `CLOSING_LINE` branch on `DOC_KIND` (lines 1497–1506); the executed 6b test asserts the bug closing line. |
| CR-3 invalid `fix_cycle` cleared silently | **FIXED** | Both blocks warn with the rejected value quoted on the non-integer arm (`fix_cycle='007x' is not a positive integer`); guard executed with `000` under bash + zsh → warning + empty. The non-positive arm's literal is cycle-4 CR-5. |
| CR-4 guard breadth / population | **FIXED** | `tests/gh-labels.test.js` matches any `--label` form and scans `skills/*/references/*.md`; 75 targeted green. |
| CR-5 invocation-string test titled as runtime | **FIXED** | Retitled "— a text pin". |

## New Findings This Cycle

- **[high]** `skills/finalise/SKILL.md:1493` — `${STEM}.implementation.*.md` matches the short-id report shape only; develop-bug's recent runs write the full-stem shape → **TASK-125-BUG-13** (reviewer CR-1 high/high, verified by execution)
- **[low]** `skills/finalise/SKILL.md:1494` — the verdict token is published raw (`**PASS**`) (CR-3, in gate)
- **[low]** `skills/finalise/SKILL.md:1486` — 6b's kind check reads `$*` alone, no cross-check against the bound `STEM` (CR-2; reviewer medium/medium, QA-held low — reasoning in the gate entry)
- cleanups: tracker-block `*)` / `esac` dedented to the enclosing `if` (CR-4); the non-positive `fix_cycle` arm names the literal `0` after normalisation, both blocks (CR-5)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review` after qa-fix cycle 3
- [x] 3/3 phases; tests passing (`npm run ci:fast` 3697/3697 at the cycle-3 fix); `bundle:check` 0 problems
- [x] Breaking changes: none declared; the no-flag promise holds (executed)
- [x] PR #447 OPEN, head `a1d13b19`

### Testing Approach

- [x] Automated Testing — 75 targeted tests on the head (`finalise-bug-mode`, `gh-labels`, `qa-cycle`)
- [x] Regression Testing — targeted suites; the fast gate was green at the fix commit and the head is unchanged
- [x] Security Review — no new boundary this cycle (reasoned)
- [x] Code Review — Step 3b, narrowed diff (5 files / 1549 lines), read-only Explore reviewer (272 s; 5 findings, every one verified — CR-1 and CR-3 by executing the 6b lines against real bug directories, CR-4/5 by executing the guard with `000` under bash + zsh)
- [x] Manual Testing — the 6b glob and verdict extraction run by hand against `docs/bugs/bug.14` (full stem) and `bug.12` (short id)

### Review Methodology

Re-review, cycle 4: direct tools + one narrowed reviewer. Traceability matrix from cycle 1 reused. `code_review_blocking=true`. Step 4b: the only new fenced content since gate 3 is the 6b derivation and the two guard-message arms, both executed above.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `finalise --bug` | FAIL | Verified | BUG-12 fixed; **BUG-13** (report glob keys on the short id; the full-stem shape HALTs); CR-3 (raw verdict token); CR-2 (kind cross-check). |
| Phase 2: tolerant issue create + legible failure | PASS | Verified | All cycle-1..3 fixes hold; guard widened (CR-4 of cycle 3). |
| Phase 3: `fix_cycle` | PASS (cleanups) | Verified | BUG-7 + cycle-3 CR-3 hold; CR-4/CR-5 cosmetic. |

**Overall Phase Completion**: 3/3 delivered; 1 FAIL, 0 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | FAIL | The 6b verdict derivation HALTs on the full-stem report shape (BUG-13); the token it publishes on the short shape carries markdown (CR-3). |
| SC2 Step 7 has no fallback paragraph | PASS | |
| SC3 A label absent from the repo never fails an issue create | PASS | |
| SC4 Any `tracker-issue.js` failure carries gh's first line | PASS | |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | PASS | Rejected values now named (cycle-3 CR-3). |
| SC6 One extra `gh label list` per create | PASS | |
| SC7 Skip list stated once; mutation-proved | PASS | |
| SC8 observations close on merge | PENDING | |

---

## Breaking Changes Validation

None declared; the "without `--bug` unchanged" promise executed and holding. **PASS**

---

## Issues Found

### HIGH Severity Issues (1)

- **BUG-13** [task.125.bug.13](./task.125.bug.13.six-b-report-glob-short-id-vs-full-stem-report-name.md) — 6b's implementation-report glob keys on the short bug id; develop-bug's recent runs write the full stem; the new HALT fires on every such run. P1.

### MEDIUM Severity Issues (0)

### LOW Severity Issues (4)

- **CR-3** (in gate) — verdict token published raw (`**PASS**`).
- **CR-2** (in gate) — 6b kind check reads `$*` only; no STEM cross-check.
- **CR-4** (advisory) — tracker-block case arm indentation.
- **CR-5** (advisory) — non-positive `fix_cycle` warning names `0`, not the supplied value.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS
### Reliability — FAIL — BUG-13 halts the only DoD path develop-bug has, on the report shape its recent runs produce; CR-3, CR-2 as above.
### Security — PASS · **Evidence**: reasoned · No new boundary; cycle-2 measured probe (20/20) unchanged since.
### Maintainability — PASS — CR-4/5 for the fix cycle.

---

## Code Review

Step 3b, narrowed (5 files / 1549 lines), 272 s; the reviewer executed the bash guards under bash 3.2 and zsh itself. QA verification: CR-1 confirmed by executing the glob — `STEM=bug.14` → empty `IMPLEMENTATION_REPORT`; `STEM=bug.12` → found; 5 of 13 real bug reports are full-stem, including the three most recent — and by reading the fixture (`task.67.bug.3.implementation.1.run.md`, short shape) → **owned as BUG-13**; CR-3 confirmed on the same run (`bug.12` → `**PASS**`; `grep -h '^\*\*Verdict\*\*:' docs/bugs/*/*.implementation.*.md | sort | uniq -c` → 9 of 25 bolded); CR-2 read against the Document-kind block at line 51 (same `$*` mechanism) — held LOW; CR-4 confirmed by reading lines 984–988; CR-5 confirmed by executing the arm with `000` (warns `fix_cycle=0`).

**Correctness bugs (2):** CR-1 high/high → BUG-13 (gate HIGH); CR-2 medium/medium → gate LOW (QA-held).
**Cleanups (3):** CR-3 low/high → gate LOW (same line as the BUG-13 fix); CR-4, CR-5 — advisory.

**Provenance:** BUG-13 is introduced by this diff (the cycle-3 BUG-12 fix added the glob; base `origin/develop` carries the pattern only in a comment at finalise line 1314). CR-3 is on the same new line. Not pre-existing.

**Boundary rule:** `boundary: false` — the diff adds no accept/reject function; `probes_executed: 0`, security evidence `reasoned`.

**Mutation-proof spot check (Step 3c):** the cycle-3 fixes' own mutations were proved at the fix commit (in-block re-bind removed → 6 red; HALT replaced by `N/A` → 2 red; closing line unconditional → 2 red) and the head is unchanged since; `not-run` this cycle. For BUG-13 the observation is the inverse: the fixture is short-shape only, so a short-only glob cannot go red — `no-red-untested` for the full-stem shape, which the fix cycle must add.

**Working tree:** QA artefacts only — no fix applied. `git status --porcelain` before Step 10: the implementation report only (deferred to Step 8 by the pipeline), as at the start of this step.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-bug-mode.test.mjs`, `gh-labels.test.js`, `qa-cycle.test.js` (75) on `a1d13b19` | PASS |
| Full fast gate (3697) at the cycle-3 fix commit; head unchanged | PASS |

---

## Test Commands Executed
```bash
node --test evals/shared/tests/finalise-bug-mode.test.mjs tests/gh-labels.test.js tests/qa-cycle.test.js   # 75 pass on a1d13b19
for STEM in bug.14 bug.12; do D=$(ls -d docs/bugs/${STEM}.*/); ls ${D}${STEM}.implementation.*.md; done   # bug.14 → no match (BUG-13); bug.12 → found
grep -E '^\*\*Verdict\*\*:' docs/bugs/bug.12.*/bug.12.implementation.1.*.md | tail -1 | awk '{print $(2)}'   # → **PASS** (CR-3)
grep -h -E '^\*\*Verdict\*\*:' docs/bugs/*/*.implementation.*.md | sort | uniq -c   # 9 of 25 bolded
FIX_CYCLE_ARG=000 bash|zsh -c '<tracker-block guard>'   # → "fix_cycle=0 is not a cycle" (CR-5), value cleared
git show origin/develop:skills/finalise/SKILL.md | grep -n 'implementation\.\*\.md'   # comment only → BUG-13 introduced here
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-13 — glob both report shapes in 6b (and the Step 2 `qa-reports` marker / `<IMPL_REPORT>` prose); add a full-stem fixture report to the executed 6b test; note both shapes beside develop-bug `SKILL.md:336`. P1.
2. CR-3 — normalise the verdict to a bare `PASS|FAIL`, HALT otherwise. CR-2 — STEM-vs-flag cross-check in 6b.

### Short-term Actions (Non-Blocking)
1. CR-4 indentation; CR-5 raw value in the non-positive warning (lines 870 and 987).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — one HIGH. The HIGH sequence across gates is 1 → 1 → 0 → 1: the new HIGH is a defect introduced by cycle 3's fix, not a survivor, and the convergence check does not trip (0 ≥ 1 is false). Cycle 5 is the budget.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: BUG-13 with a full-stem fixture in the executed test; CR-2, CR-3.

---

**QA Report**: co-located at `task.125.qa.4.develop-bug-finalise-mode-and-issue-create.md`
**Gate File**: co-located at `task.125.gate.4.develop-bug-finalise-mode-and-issue-create.yml`
**Next Steps**: `/qa-fix` cycle 4 over BUG-13 + CR-2..5; cycle-5 re-review narrowed — the budget cycle.

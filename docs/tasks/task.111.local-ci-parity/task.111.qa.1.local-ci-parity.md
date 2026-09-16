# QA Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: [Link to task document](./task.111.local-ci-parity.md)
**Gate File**: [task.111.gate.1.local-ci-parity.yml](./task.111.gate.1.local-ci-parity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

The change does what the task says: `npm run ci` now composes every lane CI runs (with one declared exclusion), the parity test reads all three green-defining workflows, all nine hook wrappers are executed by a tree-enumerated test, and the description cap is enforced with a failure. Every new test was mutation-proven by the developer and re-proven here. The diff review found three LOW correctness defects in the *tests themselves* — a skip that falls through into a throw, a corpus measurement that disagrees with the validator by two characters on block-scalar descriptions, and a missing-script guard that was left reading one job while the test around it now reads three. All three were verified by execution before being accepted as findings. One fix cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`, 5/5 progress boxes ticked)
- [x] All implementation phases completed
- [x] Tests passing (targeted suites re-run here: parity 12/12, wrappers 19/19, frontmatter 9/9)
- [x] Breaking changes documented (none; slower `ci`, tree rewrite by `check:generated` stated)
- [x] Code on feature branch with open PR (#412, head `d90e2c5c`)

### Testing Approach

- [x] Automated Testing (unit, protocol)
- [x] Regression Testing (targeted suites + lanes)
- [x] Security Review (boundary executed — 7 probes)
- [x] Code Review (Step 3b — one read-only Explore reviewer, 220 s)
- [x] Mutation-proof spot check (Step 3c)
- [ ] Performance Testing — lane timings recorded, no benchmark

### Review Methodology

Direct tools plus one diff-review subagent (standard mode; 3 phases across several modules, low risk — the Adaptive Review Strategy's default). Traceability matrix pre-built by the orchestrator (`.summaries/qa-traceability-matrix.md`, 6 SCs: 4 full, 2 none — SC4/SC5 are runtime/doc criteria). First review — no prior gate; no re-review scope.

Step 4b: runnable prose fired on `skills/develop-story/SKILL.md` (the diff touches its frontmatter; the file holds 6 fenced bash blocks). Engine run: 6 blocks, bash + zsh, 2 execution-failure findings — both from the **unchanged** line-51 `cat .agents/skills/develop-story/SKILL.md` snippet on an unseeded temp tree; re-run with `--copy` of a tree containing that path → 0 findings. Not attributable to this diff; recorded, not raised.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `lint:shell`, `check:generated`, `ci`; parity test widened | CONCERNS | Verified | Composition correct; `scripts/lint-shell.sh` shellcheck-clean, both guards present, skip path executed. Parity mutations M1–M3 red. **CR-3**: the missing-script guard still reads test.yml only — a typo'd `npm run` step in validate.yml leaves the test green (verified). |
| Phase 2: hook wrappers test + description cap | CONCERNS | Verified | 19/19 wrapper tests, mutations red naming develop-task/on-stop.sh. Cap: 1,025 fails / 1,024 passes; develop-story 907. **CR-1**: `t.skip` fall-through in the pass-through test. **CR-2**: corpus regex keeps the `>`/`|` indicator, +2 chars on six skills. |
| Phase 3: docs | PASS | Verified | releases.md names the three mirrored lanes and the two without a local form; evals README leads with `npm run ci`; CONTRIBUTING leads with the composite and the fast tier; CHANGELOG entry cites task 111. |

**Overall Phase Completion**: 3/3 phases complete; 2 with LOW findings

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC1: `npm run ci` runs all named lanes and exits 0 on `develop` | 7 lanes, exit 0 | Composite verified structurally (parity test); lanes green individually; one end-to-end run stopped at `npm test` on a **pre-existing** flake (session-handoff CR-6, identical on a clean `develop` worktree) | PASS | The flake is not this change's; the merge gate re-runs the composite. Recorded under recommendations.future |
| SC2: wrapper test covers all three pipelines, population from the tree | 3 × 3 | 19 tests over 9 wrappers, enumerated from `skills/develop-*` | PASS | CR-1 is a defect in the skip path, not in coverage |
| SC3: cap fails > 1,024; every skill passes after the trim | fail/pass | 1,025 → exit 1 with count; 1,024 → exit 0; `validate:all` 128/128 | PASS | CR-2 makes the JS corpus check disagree with the validator by 2 on block scalars — no skill is near enough for it to matter today |
| SC4: missing `shellcheck` reported, not silently passed | loud skip, exit 0 | `PATH=/usr/bin:/bin bash scripts/lint-shell.sh` → "shellcheck not installed — lane skipped (…)", exit 0 | PASS | Manual check per §8; no automated test (matrix: none) |
| SC5: releases checklist names the mirrored lanes and the unmirrored ones | named | releases.md block names test/validate/shellcheck as mirrored, docs-link-check and branch-policy as having no local form | PASS | Read directly |
| SC6: parity test reads all three green jobs and fails on an unclassified step | red on mutation | M1 (unclassified step) red; M3 (renamed step) red on 3 tests | CONCERNS | Reads all three for classification and set equality; the missing-script guard does not (CR-3) |

---

## Breaking Changes Validation

None declared. `npm run ci` is slower (measured: +~2 min of lanes on a ~20 min composite) and `check:generated` may rewrite three generated files when stale — both stated in §5. **Assessment: PASS.**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3) — in the gate `top_issues[]` (code_review_blocking=true; all three verified by execution)

- **CR-1** `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` — `t.skip(...)` does not stop the function; the null-target branch continues into `makeSandbox(..., null)` and throws. Verified: `t.skip(); throw` is reported as a failing test by node:test. Fix: `return t.skip(...)`.
- **CR-2** `tests/skill-frontmatter.test.js` — the corpus regex keeps the block-scalar indicator, so six skills measure 2 chars longer than `quick_validate.py` measures them (explain-simply 791/789, humaniser 435/433, mermaid-architect 816/814, markdown-wireframe 457/455, railway-postgres-crud 498/496, use-railway 459/457). Fix: strip `^[>|][+-]?` before normalising or parse via the PyYAML helper; add a block-scalar boundary fixture.
- **CR-3** `evals/shared/tests/ci-gate-parity.test.mjs` — "every npm script the workflow invokes actually exists" reads test.yml only; `greenScripts()` filters unknown scripts silently. Verified by mutation: `run: npm run validate:alll` appended to validate.yml → 12/12 still green. Fix: iterate `GREEN_JOBS` in that guard.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS
Lane timings: validate:all 58 s, check:generated 5 s, bundle:check 24 s, lint:shell 29 s, eval:all 14 s; `npm test` ~20 min dominates and was already in the composite. `ci:fast` unchanged.

### Reliability — PASS
Guards preserved in `lint-shell.sh`; absent-binary path executed; all mutations red in the predicted tests. Advisory CR-4 (medium confidence): `check:generated` reads as drift on an unrelated uncommitted edit to README.md / the generated files — same command CI runs on a clean checkout. Recorded, not gating.

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 7
- Boundary: the description cap (accept/reject on length). Executed against the real validator: 1,025 ASCII → reject; 1,024 → accept; 1,025 multibyte code points (2,050 bytes) → reject (characters, not bytes); 1,020 multibyte → accept; folded scalar 1,100 raw → 999 normalised → accept; folded scalar normalising to 1,026 → reject; whitespace-only → rejected by the earlier empty check. 7/7 as expected. Nothing in the change set reads network, credentials or untrusted input; `lint-shell.sh`'s file list comes from `git ls-files`.

### Maintainability — CONCERNS
The parity test's widening is half-applied: classification and set equality read three jobs, the missing-script guard reads one (CR-3). `jobSteps()` carries an unused `block` field with a comment describing a `run: |` lookahead the code does not do, and resets the step name only on `- uses:` (CR-5, advisory). Docs complete; shellcheck/prettier/bundle clean.

---

## Code Review

Step 3b — one read-only Explore reviewer over the full branch diff (1,450 lines, implementation report excluded); returned in 220 s; `code_review_blocking=true` (pipeline default; no per-doc opt-out).

**Correctness bugs (4):**
- [low/high] `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs:161` — `t.skip` fall-through into `makeSandbox(..., null)` → return after the skip. **→ gate CR-1**
- [low/high] `tests/skill-frontmatter.test.js:224` — corpus regex over-counts block-scalar descriptions by 2 → measure the validator's string. **→ gate CR-2**
- [low/medium] `evals/shared/tests/ci-gate-parity.test.mjs:288` — missing-script guard reads test.yml only → iterate GREEN_JOBS. **Promoted to gate CR-3 by QA after verifying by mutation** (the reviewer's medium confidence was the only thing keeping it advisory; the mutation settles it).
- [low/medium] `package.json:51` — `check:generated` false-positives on an unrelated dirty README/catalog/deps → advisory (CR-4, recommendations.future).

**Cleanups (1):**
- `evals/shared/tests/ci-gate-parity.test.mjs:259` — unused `block` field, stale comment, name reset only on `- uses:` → advisory (CR-5, recommendations.future).

**Boundary rule**: `boundary: true` (the description cap); `probes_executed: 7` — see Security.

**Step 3c mutation proofs (re-executed by QA, not taken from the report):**
- mutation-proven: unclassified step appended to validate.yml → `every green job is found, and every step in it is classified` → covered
- mutation-proven: `lint:shell` dropped from `ci` → `green jobs and the ci composite run exactly the same commands` → covered
- mutation-proven: shellcheck step renamed → three parity tests → covered
- mutation-proven: `"$@"` dropped from develop-task/on-stop.sh → `develop-task/on-stop.sh — argv, stdin and exit status pass through the exec` → covered
- mutation-proven: exec target renamed → `develop-task/on-stop.sh — execs an existing ../references/ target` → covered
- mutation-proven: 1,025-char description → `validator rejects a description over the Agent Skills 1,024-char cap` (and the validator's own exit 1) → covered
- **not covered**: a typo'd `npm run` step in validate.yml → no test red (CR-3) → no-red-untested

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm test` (full, one end-to-end run by develop) | 3334/3336 pass, 1 fail (session-handoff CR-6, pre-existing — fails identically on a clean develop worktree), 1 skipped |
| `validate:all` | 128 passed, 0 failed |
| `check:generated` | clean tree after regeneration |
| `bundle:check` | 128 skills, 0 problems |
| `lint:shell` | 60 sources, clean |
| `eval:all` | exit 0 |
| `prettier --check` on changed JS/JSON | clean |

---

## Test Artifacts

### Files Reviewed
`package.json`, `scripts/lint-shell.sh`, `.github/workflows/{test,validate,shellcheck}.yml`, `evals/shared/tests/ci-gate-parity.test.mjs`, `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs`, `tests/skill-frontmatter.test.js`, `skills/create-skill/scripts/quick_validate.py`, `skills/develop-story/SKILL.md`, `docs/contributing/releases.md`, `docs/contributing/evals/README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, the task document and plan.

### Test Commands Executed
```bash
node --test evals/shared/tests/ci-gate-parity.test.mjs
node --test evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs
node --test tests/skill-frontmatter.test.js
shellcheck --severity=warning scripts/lint-shell.sh
python3 -m py_compile skills/create-skill/scripts/quick_validate.py
node references/qa-execute-snippets.mjs --file skills/develop-story/SKILL.md --json   # + --copy re-run
# mutation for CR-3: append `run: npm run validate:alll` to validate.yml → parity still 12/12
# 7 boundary probes against quick_validate.py (see Security)
```

### Coverage Report
Not measured — the suite is `node --test` without a coverage reporter; 25 new tests, every invariant mutation-proven except the one CR-3 names.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — return after `t.skip()` (P2)
2. CR-2 — measure the validator's string in the corpus test; boundary fixture for a block scalar (P2)
3. CR-3 — widen the missing-script guard to `GREEN_JOBS` (P2)

### Short-term Actions (Non-Blocking)
1. CR-4 — decide whether `check:generated` should compare against `HEAD` rather than the working tree, or document the clean-tree expectation
2. CR-5 — tidy `jobSteps()` (unused field, comment, name reset on every list item)
3. File a bug against the session-handoff CR-6 test's 3 s cap on hosts with slow npm startup (pre-existing)

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH or MEDIUM findings; three LOW correctness defects in the new tests, each verified by execution, and maintainability CONCERNS for the half-widened guard. Deterministic rules: no high → not FAIL; no medium; NFR CONCERNS (maintainability) → CONCERNS. Score 100 − 10 = 90.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2, CR-3 fixed and re-reviewed

---

**QA Report**: co-located at `task.111.qa.1.local-ci-parity.md`
**Gate File**: co-located at `task.111.gate.1.local-ci-parity.yml`
**Next Steps**: `/qa-fix` on the three gate entries; re-review (cycle 2 is a full refute pass)

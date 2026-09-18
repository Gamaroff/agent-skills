# QA Report: Task 121 - QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Task**: [Link to task document](./task.121.cycle-scoped-qa-tracker-comments.md)
**Gate File**: [task.121.gate.1.cycle-scoped-qa-tracker-comments.yml](./task.121.gate.1.cycle-scoped-qa-tracker-comments.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: CONCERNS

---

## Executive Summary

PR #430 delivers all three phases: `qa-gate` is cycle-scoped in both engine lists, the three tracker call sites and four PR-lead sites carry the cycle suffix, the orchestrator's two duplicate blocks are gone, the contract states the idempotency scope, and a guard fails on a bare cycle-scoped stage. `npm run ci:fast` is green at the PR head (3416 tests, 3415 pass, 1 skipped), ShellCheck and `bundle:check` clean, and the developer's three mutation proofs re-ran red/green against the committed state. The diff review found one MEDIUM defect in the new cycle derivation — a number-less gate filename makes the promised fallback unreachable and the stage invalid — and two LOW guard-hardening gaps.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (marker rename, one-off duplicate on an in-flight issue)
- [x] Code on feature branch with open PR (#430, OPEN, base develop)

### Testing Approach

- [x] Automated Testing (unit — `npm run ci:fast` at 2a84a88b)
- [x] Regression Testing (full hermetic suite; targeted guard suites)
- [x] Security Review (reasoned — no boundary delivered)
- [x] Code Review (Step 3b — read-only Explore reviewer over the source-only branch diff)
- [x] Mutation-proof spot check (Step 3c — three mutants re-run against committed state)
- [x] Documented-command execution (Step 4b — engine over six changed files + direct execution of the changed derivation lines under bash and zsh)

### Review Methodology

Direct tools + one read-only code-review subagent (first review; 3 phases, multiple modules, `risk_level: low`). `code_review_blocking=true` passed by the orchestrator; no reviewer finding was `bug`+`high`, so none was promoted mechanically — the MEDIUM entry in `top_issues[]` is CR-1 **verified by QA** (reproduced: `sed` prints the path; the lead CLI exits 2 on the resulting stage). Traceability mapper not dispatched (Success Criteria are checkbox lists, not a table). Step 4b: the engine classified every changed block as `mutating` (they post comments / write files — deny-listed by design) or `placeholder` (unbound orchestrator variables), so it executed zero blocks in the four skill/step files (`zero-blocks-executed`, recorded, not suppressed); the changed derivation lines were therefore executed **directly** from the shipped files against a fixture directory under bash and zsh (see Test Artifacts). `tracker-comment-contract.md` → `no-executable-blocks` (its one block is the canonical call shape); `stakeholder-summary.md` has no fences.

---

## New Findings This Cycle

_First review — not applicable._

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine (`qa-gate` cycle-scoped) | PASS | Verified | Both lists updated (0230ac56); literal `deepEqual` in NEW-6 now four members; `qa-gate-2` accepted, `qa-gate-x` / `in-review-2` rejected; lead parity for `qa-gate-2`; new per-cycle marker test (same cycle `already`, next cycle `posted`, bare marker does not suppress). Removing `qa-gate` from either list goes red (9 and 2 failures respectively). |
| Phase 2: call sites + orchestrator blocks | CONCERNS | Verified | All three tracker sites and four PR-lead sites suffixed (7fc91472); `QA_CYCLE` derived once above the PR lead in qa-task/qa-story with the same `sed` as qa-fix; `:-1` fallback added at all three (a necessary deviation from the plan, correctly reasoned in the task Notes). Both orchestrator blocks removed with a pointer each; `develop-bug` verify loop untouched. **BUG-1**: the `sed` form prints the path on a non-numeric gate name, so the fallback is unreachable in that case (see Issues). Precompact lead suffix matches its tracker twin; ShellCheck clean. |
| Phase 3: contract + guard | PASS | Verified | Contract table describes `CYCLE_SCOPED_STAGES` rather than restating it; `--stage` validation paragraph cross-references it. Guard covers `SITES` (24 total, 5 suffixed) and `PR_SITES` (12 total, 4 suffixed) with floor ≥4 each; red on a bare `qa-fix` tracker call naming `skills/qa-fix/SKILL.md`. Two hardening gaps (CR-3, CR-4) below. |

**Overall Phase Completion**: 3/3 phases delivered; 1 phase with a finding.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every QA cycle's gate and fix comment reaches the tracker with a distinct marker | yes | proven at unit level (`qa-gate-2` → posted, `qa-gate-3` → posted) | PASS | Consumer check runs live on this very PR: this report's own Step 13b posts `qa-gate-1` on #421. |
| A resumed cycle still returns `already` for its own suffixed stage | yes | `qa-gate-2` twice → `already` | PASS | |
| Neither orchestrator block remains; develop-bug's `qa-cycle-{N}` unchanged and passes the guard | yes | 0 `qa-cycle-{N}` / `qa-fix-{N}` invocations left in the qa-loop doc; develop-bug `:89` collected as suffixed | PASS | |

**Performance**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No change to comment latency | one list member | one list member in each of two frozen arrays | PASS |

**Code Quality**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `npm test` green; guard has non-vacuity floor; mutation proof recorded | yes | ci:fast green; floors ≥4/≥4; proofs in implementation report and re-run here | PASS | |
| `CYCLE_SCOPED_STAGES` remains the single definition | yes | contract table cross-references; test imports the list | PASS | |
| Linting | 0 errors | prettier `--check .` clean; ShellCheck clean (56 sources) | PASS | |

**Migration**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Contract documents the stage classes; observation #75 actioned with PR number | yes / pending | table present; #75 not yet actioned | PARTIAL | #75 closure belongs to `/finalise` (needs the PR number, now known: #430). |

---

## Breaking Changes Validation

### Breaking Change: QA-stage marker text `qa-gate` → `qa-gate-N`
Documented: Yes (§5 of the task)
Migration Path Provided: Yes — none needed; at most one duplicate comment on one in-flight issue, then correct
Migration Tested: Yes — unit test asserts a pre-existing bare `qa-gate` marker does not suppress `qa-gate-2`
Consumer Code Updated: N/A (comments only)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Cycle derivation prints the whole path on a non-numeric gate name — fallback unreachable, stage invalid**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.121.bug.1.cycle-derivation-unreachable-fallback.md](./task.121.bug.1.cycle-derivation-unreachable-fallback.md)
- **Observation**: `sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'` without `-n`/`p` echoes the input on non-match; a gate named without a number (the form qa-story's naming section still documents) yields `QA_CYCLE=/abs/path`, `${QA_CYCLE:-1}` never fires, and `--stage "qa-gate-/abs/path"` is exit 2 on both CLIs — the PR-comment block aborts on `|| exit 1`.
- **Impact**: Latent (no number-less gate exists; `qa-gate` writes numbered files) but the task turned a slot-drop into an abort, and the comment beside the derivation promises a fallback that this case cannot reach.
- **Recommendation**: `sed -nE '…/p'` at all three sites; assert emptiness on a number-less name.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-4** `evals/shared/tests/transition-protocol-parity.test.mjs:111` — the `--stage\s+([a-z][a-z-]*)` scan does not match the quoted `--stage "qa-gate-${QA_CYCLE}"` form, so the suffixed QA sites and the precompact lead call silently left that test's population (still covered by comment-slot-coverage Guard C). → extend the regex with an optional opening quote and confirm the count rises.
- **CR-3** `shared/resources/tests/comment-slot-coverage.test.mjs:290` — the never-passed-bare guard accepts any suffix, so a hard-coded `--stage qa-gate-1` at a shipped site passes while reintroducing the suppression. → also reject a fixed numeric suffix; mutation-prove with a literal.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
One additional member in two frozen arrays; no runtime path change.

### Reliability — PASS
Fallback to `1` executed under bash and zsh on an empty fixture dir; per-cycle marker behaviour proven at unit level; BUG-1 narrows the fallback for a filename form no writer produces today.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary delivered (`boundary: false`): the change adds a list member, derives a shell value from filenames on disk, edits documentation and adds a test. The only new value reaching a consumer is the cycle string interpolated into `--stage`, which both CLIs validate against a fixed list and reject with exit 2 (BUG-1 is that rejection firing on a malformed name).

### Maintainability — CONCERNS
Two guards narrowed or incomplete relative to the change (CR-3, CR-4). Otherwise good: the contract describes the engine list rather than restating it, the plan deviation is recorded in the task Notes, bundled copies regenerated and `bundle:check` clean.

---

## Code Review

Step 3b — read-only Explore reviewer over the source-only diff (`git diff origin/develop...HEAD -- . ':!skills/*/references/*'`, 17 files, 841/177). `code_review_blocking=true`; no finding was `bug`+`high`, so none was promoted mechanically. CR-1 verified by QA and entered as TASK-121-BUG-1 (medium); CR-3 and CR-4 entered as LOW; CR-2 routed to `recommendations.future` (pre-existing `ls -t` derivation the task kept deliberately). `boundary: false`, `probes_executed: 0`.

**Correctness bugs (2):**
- [medium/medium] `skills/qa-task/SKILL.md:1273` — `sed -E` prints the whole path on a non-numeric gate name; fallback unreachable; stage invalid (also qa-story :1863, qa-fix :820) → use `sed -nE … p` (**verified → BUG-1**).
- [low/low] `skills/qa-fix/SKILL.md:820` — cycle read by mtime (`ls -t`) while Phase 0 uses the highest number; equal mtimes in a fresh checkout fall back to lexical order → derive the max numeric segment (**pre-existing; future**).

**Cleanups (2):**
- `shared/resources/tests/comment-slot-coverage.test.mjs:290` — guard accepts a literal `qa-gate-1` → also reject a fixed numeric suffix (**CR-3**).
- `skills/qa-task/SKILL.md:1352` — quoted stage form drops the six QA sites out of `transition-protocol-parity.test.mjs`'s regex population → accept an optional opening quote (**CR-4**).

**Mutation proofs (Step 3c, against the committed state, `cp`-snapshot and restore, tree verified unchanged):**
- mutation-proven: qa-fix tracker call reverted to bare `--stage qa-fix` → `a cycle-scoped stage is never passed bare (SITES)` red naming `skills/qa-fix/SKILL.md` → covered
- mutation-proven: `"qa-gate"` removed from `CYCLE_SCOPED_STAGES` → 9 tests red across tracker-comment / stakeholder-summary / comment-slot-coverage → covered
- mutation-proven: `"qa-gate"` removed from `CYCLE_SCOPED_LEAD_STAGES` only → 2 tests red (`cycle suffix is legal only for cycle-scoped stages`, list-equality) → covered

Platform variance: not applicable — no environment-derived value reaches a validating consumer in this diff.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) at 2a84a88b | PASS — 3416 tests, 3415 pass, 0 fail, 1 skipped; prettier clean |
| Bundle freshness (`npm run bundle:check`) | PASS — 128 skills, 0 problems |
| Precompact hook suite (`develop-pipeline-on-precompact.test.sh`) | PASS — 15/15 |
| Guard suites (comment-slot-coverage, transition-protocol-parity, mutation-call-site-coverage) | PASS — 47/47 |
| develop-bug verify loop (`qa-cycle-{N}` retained) | PASS — collected as a suffixed site; no doc change |

---

## Test Artifacts

### Files Reviewed
`shared/resources/tracker-comment.js`, `shared/resources/stakeholder-summary.js`, `shared/resources/tracker-comment-contract.md`, `shared/resources/stakeholder-summary.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-on-precompact.sh`, `shared/resources/tests/{tracker-comment,stakeholder-summary,comment-slot-coverage}.test.mjs`, `evals/shared/tests/transition-protocol-parity.test.mjs`, `skills/{qa-task,qa-story,qa-fix}/SKILL.md`.

### Test Commands Executed
```bash
npm run ci:fast                                   # exit 0 — 3416 / 3415 pass / 1 skipped
npm run bundle:check                              # 0 problems
bash shared/resources/develop-pipeline-on-precompact.test.sh   # 15 passed
command node --test shared/resources/tests/comment-slot-coverage.test.mjs evals/shared/tests/transition-protocol-parity.test.mjs tests/mutation-call-site-coverage.test.js   # 47 pass
command node references/qa-execute-snippets.mjs --file skills/{qa-task,qa-story,qa-fix}/SKILL.md --json   # zero-blocks-executed (all changed blocks mutating/placeholder)
# Direct execution of the shipped derivation lines (extracted with sed from the SKILL.md files):
#   bash/with:  qa-task=2 qa-story=3 qa-fix=3   zsh/with:  identical
#   bash/empty: qa-task=1 qa-story=1 qa-fix=1   zsh/empty: identical (zsh prints "no matches found" to stderr; fallback recovers)
# BUG-1 reproduction:
echo "/x/task.121.gate.yml" | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'          # prints the path
command node shared/resources/stakeholder-summary-cli.js --stage "qa-gate-/x/task.121.gate.yml"   # exit 2
```

### Coverage Report
Not instrumented in this repository (node --test without coverage); pass/fail counts above.

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-1 — `sed -nE … p` at all three derivation sites so the `:-1` fallback is reachable on a non-match; add an emptiness assertion.
2. CR-4 — extend the parity test regex to accept an optional opening quote; confirm the population count rises.
3. CR-3 — reject a fixed numeric suffix in the never-passed-bare guard; mutation-prove with a literal.

### Short-term Actions (Non-Blocking)
1. CR-2 — derive the cycle as the maximum numeric segment rather than by mtime when the derivation is next touched.
2. Align qa-story's File Naming Conventions with the numbered gate filename every writer produces.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: All success criteria that can be checked offline pass and the guard is proven load-bearing three ways; one verified MEDIUM defect in the new derivation (fallback unreachable, stage invalid on a number-less gate) and two LOW guard gaps keep it short of PASS. None is a HIGH.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-1 fixed at all three sites; CR-4 regex extended; CR-3 hardened or explicitly waived.

---

**QA Report**: co-located at `task.121.qa.1.cycle-scoped-qa-tracker-comments.md`
**Gate File**: co-located at `task.121.gate.1.cycle-scoped-qa-tracker-comments.yml`
**Next Steps**: `/qa-fix` on the three open `top_issues[]`, then re-review (cycle 2 — full refute pass).

# QA Report: Task 182 - reenter-qa refusal diagnostics and the qa_reentry reader population

**Task**: [Link to task document](./task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)
**Gate File**: [task.182.gate.3.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml](./task.182.gate.3.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate 2](./task.182.gate.2.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml), CONCERNS 90, head `4eb35d36`. Fix commits `91ec5a92`, `93539f1b`.

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-182-003 (pause row: both re-entry writers set 5a) | ✅ FIXED | The row states 5b on a not-converging restore, 5a otherwise (live lock included), reenter always 5a — matches `grant-qa-cycles.sh:177-238` and `reenter-qa-after-finalise.sh` (reviewer-verified). Bug report task.182.bug.1 closed. |
| CR-2 (no-gate route could reach step 7) | ✅ FIXED | Route is back to the operator, never step 7; reverting it → refusal-parity red |
| CR-3 (halt-7 bullet omits git-unreadable) | ✅ FIXED | Bullet names all three; the set is derived from the list |
| CR-4 (5b claim false with a live lock) | ✅ FIXED | Row states the live-lock case |
| CR-5 (wrong-repo cwd read as git-unreadable) | ✅ FIXED | Usage error; two suite cases; cwd guard off → 2 red |
| CR-6 ("Resume at 5a" label) | ⏭️ DEFERRED | Pre-existing, pinned by eval replay fixtures; recorded in the task's Deferred work |
| CR-7 (CHANGELOG reader count) | ✅ FIXED | — |

---

## Executive Summary

QA cycle 3 at `93539f1b`, scoped to the 10 files changed since gate 2. Every value the documents state is now correct. One medium finding remains: the consolidation claims more than it holds. The pause row calls itself the one statement of the values, yet the resume contract restates the grant's values. The guard meant to catch that keys on one spelling over a hand-kept file list.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#642)

### Review Methodology

Direct tools, plus one read-only Explore code reviewer. Reviewer: 176.6 s (`duration_ms` 176578 from the completion notice).

Re-review scope: files changed since gate 2 (head 4eb35d367aa4; 10 files) — default. `SAFETY_REPROBE=false`.

Step 4b: both SKILL.md (10 blocks each, seeded with `--copy-as skills/<skill>:.agents/skills/<skill>`) — 0 findings; `develop-pipeline-resume-contract.md` 31 blocks, 0 findings; `develop-pipeline-hooks.md` 3 blocks, all refused as mutating (`no-executable-blocks`, information); `develop-pipeline-pause.md` 0 bash blocks. Shells: bash (zsh absent).

---

## New Findings This Cycle

- **[medium/high]** `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:214` (defect site `shared/resources/develop-pipeline-resume-contract.md:634-635`) — the contract restates "the grant writes `5a`/`5b`" while the pause row claims to be the one statement; `VALUE_CLAIM` cannot see "the grant" or a wrapped line → cite the row, widen the match. **TASK-182-004.**
- **[low/medium]** `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:215` — the describer list is the hand-kept `FILES` map → derive it by grep. Folded into TASK-182-004.
- **[low/medium]** `skills/develop-task/SKILL.md:328` — the "Resume at 5a" option label: the cycle-2 CR-6 deferral, unchanged. Advisory.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | Suite 61/61 |
| Phase 2 | PASS | cwd guard verified by the reviewer against symlinks and worktrees |
| Phase 3 | CONCERNS | TASK-182-004 |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Three `no-gate` causes relay their reason | PASS | suite |
| `git-unreadable` before any write | PASS | suite |
| Contract list = script reasons | PASS | refusal parity |
| Hooks doc and detector name `qa_reentry`; both `qa_max_cycles` writers named | PASS | lock-fields parity |
| Gate-read additions only `mktemp`/`sort`/`rm` | PASS | `reenter-qa-after-finalise.sh:169-172` (the cwd guard sits before the gate read, among the usage checks) |
| ShellCheck, Prettier, `npm test`, `bundle:check` | PASS | `ci:fast` 5424/0 at `91ec5a92` content; `bundle:check` clean at `93539f1b` |
| Standards-named validation | PASS | `npm run validate` 7/7 changed skills |
| CHANGELOG cites task 182 | PASS | — |

---

## Breaking Changes Validation

None. The new cwd usage error refuses only invocations that already could not measure correctly. **PASS (N/A).**

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: the qa_phase rule is "stated once" but the contract restates it**
- **Severity**: MEDIUM
- **Bug Report**: [task.182.bug.2.consolidated-qa-phase-rule-restated.md](./task.182.bug.2.consolidated-qa-phase-rule-restated.md)
- **Observation**: contract `:634-635`; `VALUE_CLAIM` and the `FILES`-based describer list both miss it.
- **Impact**: the guard cannot see the next drift; values are correct today.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (advisory, deferred)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 — `task.182.qa.3.security.run.json`, 0 reproduced, 0 escapes, every case exit 0 or 1.
### Maintainability — CONCERNS
TASK-182-004.

---

## Code Review

Anchors: `finding-anchors.js --rev HEAD` — all resolve. `code_review_blocking=true`. **boundary: true**, `probes_executed: 8`.

**Correctness bugs (3):** CR-1 [medium/high] **promoted: TASK-182-004**; CR-2 [low/medium] (folded into TASK-182-004); CR-3 [low/medium] (deferred label).

**Mutation proofs** (cycle 2 fixes; recorded at fix time on the same test files, now committed):

- mutation-proven: cwd guard disabled → "other-repo cwd", "subdirectory cwd" red → covered
- mutation-proven: pause row 5b→5a → parity red → covered
- mutation-proven: a value restated in the hooks doc → parity red → covered
- mutation-proven: `no-gate` dropped from the halt-7 bullet → refusal-parity red → covered
- mutation-proven: `no-gate` route reverted to step 7 → refusal-parity red → covered
- mutation-proven: `no-gate` dropped from develop-story SKILL.md → refusal-parity red → covered
- not proven: "the grant writes `5a`" in a describer → `VALUE_CLAIM` → no-red-untested (TASK-182-004, shown by the contract text itself)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Re-entry suite | PASS (61/61) |
| Parity tests | PASS (12/12) |
| Security-probe shell-argv proof run | PASS (8 engage) |

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — TASK-182-004 closed.

**Next Steps**: `/qa-fix` cycle 3 — scope the claim: the row owns the grant's halt-dependent value, the contract cites it, the guard reads every describer.

# QA Report: Task 276 - Halts and re-entries leave and read true state

**Task**: [Link to task document](./task.276.halts-and-re-entries-leave-and-read-true-state.md)
**Gate File**: [task.276.gate.4.halts-and-re-entries-leave-and-read-true-state.yml](./task.276.gate.4.halts-and-re-entries-leave-and-read-true-state.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-16
**Testing Completed**: 2026-11-16
**Gate Status**: PASS

---

## Executive Summary

This cycle re-enters QA after `/finalise` run 1 found five gaps (four criteria without committed evidence, plus stale behaviour docs). The fixes landed in `5abb1c99c`. This report holds the evidence the DoD reads: an ordered refusal-then-re-entry test, four fresh mutation proofs, a clean shell lint, the corrected caller list and the corrected docs. No new finding.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#913, OPEN)

### Testing Approach

- [x] Automated Testing (shell suites, node suites, remote CI-parity lint)
- [x] Regression Testing
- [x] Security Review (reasoned; see NFR Assessment)
- [x] Code Review (inline; see Code Review)

### Review Methodology

Adaptive strategy override: lite mode — direct tools only.

Re-review scope: files changed since gate 3 (head fb9b6bce450a; 6 files under `shared/resources/` plus the task directory) — default. The code-moved check reported 1 and the safety re-probe clause 1 reported `false`.

Diff review: code review. The delta is 18 changed lines (one test block, two message strings, three documentation lines), so QA read all of it inline rather than dispatching a reviewer. **Independent review did not run this cycle**; the delta changes no guard logic.

Step 4b: not applicable — no runnable prose with new logic in the change set (the three documentation edits add a command name to prose that earlier cycles executed).

CI on 5abb1c99ccee: green (`qa-ci-read.sh`, state SUCCESS).

---

## Re-Review Context

| Source | Item | Status |
| --- | --- | --- |
| `/finalise` run 1, gap 1 | Criterion 2: no ordered refusal-then-re-entry test | ✅ FIXED — see Success Criteria |
| `/finalise` run 1, gap 2 | Criterion 5: no named mutation proofs in a QA report | ✅ FIXED — four proofs below |
| `/finalise` run 1, gap 3 | Criterion 7: shellcheck not run on the cycle 2 and 3 edits | ✅ FIXED — clean on 145 scripts |
| `/finalise` run 1, gap 4 | Criterion 8: stale caller list | ✅ FIXED — re-measured in the task document |
| `/finalise` run 1, gap 5 | Three stale behaviour-doc lines | ✅ FIXED — three docs updated |
| Gate 3 T276-QA-6 | `./` lock directory called unresolvable | ⚠️ OPEN, advisory (carried, low) |
| Gate 3 T276-QA-7 | Stale relative lock message blames the cwd | ⚠️ OPEN, advisory (carried, low) |

---

## New Findings This Cycle

None. Searched files changed since gate 3's head: `shared/resources/reenter-qa-after-finalise.test.sh`, `set-qa-phase.sh`, `set-waiting-on.sh`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-pause.md`, `develop-pipeline-hooks.md`, plus the task directory. The bundled `skills/*/references/` copies were checked by `npm run bundle:check` (129 skills, 0 problems).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | PASS | Verified | Unchanged since gate 3 |
| Phase 2 | PASS | Verified | Unchanged since gate 3 |
| Phase 3 | PASS | Verified | Unchanged since gate 3 |
| Phase 4 | PASS | Verified | Docs corrected this cycle |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| 2. A plain `--restore` of a gaps snapshot is refused, then the re-entry succeeds | `shared/resources/reenter-qa-after-finalise.test.sh`, block "ordered 1/2", "ordered 2/2" and "ordered: snapshot intact", one snapshot, in order. Suite: 83 passed, 0 failed | PASS |
| 5. Each new mode and fence is held by a committed test | Four mutation proofs below, each reddened a committed test | PASS |
| 7. shellcheck passes on the touched scripts | `CI=true npm run test:remote -- --run lint:shell` → "linting 145 source shell scripts (0.10.0)", "shellcheck: clean", exit 0 | PASS |
| 8. Every `--restore` caller is accounted for | Caller list re-measured in the task document, including the three message sites (`set-qa-phase.sh`, `set-waiting-on.sh`, `develop-pipeline-on-precompact.sh`) | PASS |
| Docs match the shipped behaviour | `pipeline-resume-detector-prompt.md` counts cycles with `qa-report-cycles.sh` (resolves in both `develop-story` and `develop-task` references; run on this report it prints 3); `develop-pipeline-pause.md` and `develop-pipeline-hooks.md` describe `--halt` and the DoD-gaps refusal | PASS |

Criteria drift: `clean` (base `review-commit`, 0 changed). CHANGELOG: `cites (task 276)`.

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (0 new; 2 carried, see Re-Review Context)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 new

---

## NFR Assessment

### Performance — PASS
No code path changed. The gate 3 wall-time measurement (+0.8%) still holds.

### Reliability — PASS
The refusal-then-re-entry order is held by one committed test on one snapshot.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (the `/finalise` run 1 probe plan ran 44, 0 reproduced; this cycle adds no code)
- Boundary: `internal`. The criteria word "refuses" names the restore guard and the re-entry refusals, whose only inputs are artefacts this pipeline writes.

### Maintainability — PASS
Docs and the cycle-count command agree with the scripts. T276-QA-7 stays advisory.

---

## Code Review

Diff review: code review (inline; 18 changed lines).

**Correctness bugs (0):** none. The new test block shares one fixture (`mkrepo ordered; codefix`) across the refusal and the re-entry, reads the snapshot before the second step, and asserts the lock is absent after the refusal.

**Cleanups (0):** none.

mutation-proven: disabled the DoD-gaps guard in `advance-pipeline-lock.sh` (`&& false` on the `is_dod_gaps_halt` condition) → `reenter-qa-after-finalise.test.sh` "ordered 1/2: refusal", "ordered 2/2" and "ordered: snapshot intact" went red (80 passed, 3 failed) → covered

mutation-proven: replaced `mv "$tmp" "$SNAPSHOT"` with `rm -f "$tmp"` in `halt_lock` (no snapshot written) → `advance-pipeline-lock.test.sh` `--halt`, `--halt idempotent` and `--halt snapshot round-trips` went red under bash and zsh (6 failed) → covered

mutation-proven: changed `tail -1` to `head -1` in `newest_dod` (returns the oldest DoD) → `advance-pipeline-lock.test.sh` "halt_step 7, DoD not GAPS" and "--newest-dod stem" went red under bash and zsh (4 failed), and `reenter-qa-after-finalise.test.sh` "newest DoD file accepted" went red (1 failed) → covered

mutation-proven: moved the flag after the `<doc-dir>` in the `develop-task` SKILL.md HALT fence → `tests/halt-fence.test.js` "develop-task: the fence, run as written, snapshots the lock and removes it" went red (5 passed, 1 failed) → covered

mutation-proven: the step-8 checklist test change (HALT after `/commit-changes` snapshots `halt_step` 8) → `step-8-completion-checklist.test.mjs` "a Step 8 HALT after /commit-changes snapshots halt_step 8, and --restore reads 8" went red under bash and zsh → covered. Measured earlier in this session (`step8-mut.log`), not re-run this cycle.

All four fresh mutations were applied with the file tool, run, then restored from a `cp` snapshot; `cmp` printed nothing and `git status --porcelain` was empty afterwards. Four of the five proofs were run this cycle; the fifth is the earlier measurement named above.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `reenter-qa-after-finalise.test.sh` | PASS — 83 passed, 0 failed |
| `set-qa-phase.test.sh` | PASS — 24 passed, 0 failed |
| `set-waiting-on.test.sh` | PASS — 25 passed, 0 failed |
| `advance-pipeline-lock.test.sh` (unmutated, after restore) | PASS |
| `tests/halt-fence.test.js` (after restore) | PASS — 6 passed, 0 failed |
| `npm run bundle:check` | PASS — 129 skills, 0 problems |
| `npm run validate -- skills/develop-task/` | PASS |
| Remote CI-parity full suite (earlier this run) | 8501 of 8506 pass; the two failures are load-sensitive per-file budgets (`tests/bundle-missing-source.test.js`, `tests/test-clean-checkout.test.js`) that pass alone. They are unrelated to this change. |

---

## Test Artifacts

### Files Reviewed
`shared/resources/reenter-qa-after-finalise.test.sh`, `set-qa-phase.sh`, `set-waiting-on.sh`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-pause.md`, `develop-pipeline-hooks.md`, the task document.

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
bash shared/resources/set-qa-phase.test.sh
bash shared/resources/set-waiting-on.test.sh
bash shared/resources/advance-pipeline-lock.test.sh
command node --test tests/halt-fence.test.js
npm run bundle:check
npm run validate -- skills/develop-task/
CI=true npm run test:remote -- --run lint:shell
```

### Coverage Report
Not measured this cycle; no production code changed.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. T276-QA-6 and T276-QA-7 in `resume-prompt-check.sh` (carried, low).
2. A test that `grant-qa-cycles.sh` and `accept-qa-residual.sh` relay the DoD-gaps refusal (cycle 1, CR-2).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every `/finalise` run 1 gap has committed evidence, and no new finding was raised.
**Quality Score**: 92/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.276.qa.4.halts-and-re-entries-leave-and-read-true-state.md`
**Gate File**: co-located at `task.276.gate.4.halts-and-re-entries-leave-and-read-true-state.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise` run 2.

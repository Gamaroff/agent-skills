# QA Report: Task 276 - Halts and re-entries leave and read true state

**Task**: [Link to task document](./task.276.halts-and-re-entries-leave-and-read-true-state.md)
**Gate File**: [task.276.gate.5.halts-and-re-entries-leave-and-read-true-state.yml](./task.276.gate.5.halts-and-re-entries-leave-and-read-true-state.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-16
**Testing Completed**: 2026-11-16
**Gate Status**: PASS

---

## Executive Summary

This cycle re-enters QA after `/finalise` run 2 found two evidence gaps, both low: criterion 4 (the wall-time figure was measured on `fb9b6bce4`, not on head) and criterion 5 (no mutation proof for the `no-code-moved` ordered route). No code changed. This report holds the two pieces of evidence: a wall-time re-measure on head `948f5f6e9`, and a named mutation proof for the ordered route.

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

- [x] Automated Testing (shell suite, remote CI-parity runs)
- [x] Regression Testing
- [x] Security Review (reasoned; see NFR Assessment)
- [x] Code Review (none needed: no code changed)

### Review Methodology

Adaptive strategy override: lite mode — direct tools only.

Re-review scope: documentation and evidence only. The branch tree on head `948f5f6e9` is identical in code to gate 4's head `5abb1c99c` (the commits between are task-directory documents). No diff review ran: there is no code delta. **Independent review did not run this cycle.**

CI on `948f5f6e9`: `test`, `validate`, `shellcheck`, `link-check` and `secret-scan` all pass (`gh pr checks 913`).

---

## Re-Review Context

| Source | Item | Status |
| --- | --- | --- |
| `/finalise` run 2, gap 1 | Criterion 4: wall time not measured on head | ✅ FIXED — measured below |
| `/finalise` run 2, gap 2 | Criterion 5: no mutation proof for the `no-code-moved` ordered route | ✅ FIXED — proof below |
| Gate 3 T276-QA-6 | `./` lock directory called unresolvable | ⚠️ OPEN, advisory (carried, low) |
| Gate 3 T276-QA-7 | Stale relative lock message blames the cwd | ⚠️ OPEN, advisory (carried, low) |

---

## New Findings This Cycle

None.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| 4. `CI=true npm test` wall time within 10% of `develop` | Median of five alternating develop/branch pairs on head `948f5f6e9`: develop 770 s, branch 796 s, **+3.4%** wall; suite `duration_ms` median 645309 vs 634539, **-1.7%**. All ten runs exited 0. See the table below | PASS |
| 5. Each change has a mutation proof in a QA report | The `no-code-moved` ordered route is proven below, alongside the eight proofs in qa.1 to qa.4 | PASS |

### Wall-time measurement (criterion 4)

Method: `CI=true npm run test:remote -- --run test` on `ci@192.168.1.249` (the CI-parity container), alternating `develop` (a detached worktree at `34ec0cceb`) and the branch (this checkout, clean, head `948f5f6e9`), five pairs, server uptime read before each run.

| Pair | develop wall (s) | branch wall (s) | Branch vs develop | Server load before (develop / branch) |
| --- | --- | --- | --- | --- |
| 1 | 770 | 796 | +3.4% | 4.39 / 5.86 |
| 2 | 1136 | 836 | -26% (outlier) | 10.41 / 19.94 |
| 3 | 727 | 724 | -0.4% | 2.41 / 2.82 |
| 4 | 720 | 729 | +1.3% | 0.67 / 0.52 |
| 5 | 804 | 1264 | +57% (outlier) | 3.25 / 19.00 |
| **median** | **770** | **796** | **+3.4%** | |

Suite-reported `duration_ms` (not subject to sync and build time): develop 645309, branch 634539 at the median, **-1.7%**. The pair 2 and 5 outliers coincide with server load near 20 on the slower side; they sit on opposite sides of the median, so they do not move it. The bound is 10%; the median is well inside it on both measures.

Process notes, disclosed: two earlier attempts at this measurement were stopped by the host for low memory, and one attempt recorded five `develop` runs that failed in under 3 s because a stale server lock from the first killed run blocked them. That attempt produced no data and none of it is used. The lock was cleared with `--unlock`, then a fail-fast guard was added to the script. A third attempt was killed again after three clean runs; its container was stopped and its own orphaned lock removed by hand. The figures above come from the one complete fourth attempt.

### Mutation proof (criterion 5)

mutation-proven: swapped the order of the two remedies in `no_code_moved()` in `shared/resources/reenter-qa-after-finalise.sh`, so the untracked-files message named step 7 first and commit-and-re-run second (`$STEP7_ROUTE. Otherwise, if one is, commit it and run this script again — nothing was consumed.`) → `reenter-qa-after-finalise.test.sh` "untracked route order" went red (82 passed, 1 failed) → covered. After restoring the file from a `cp` snapshot, `cmp` printed nothing, `git status --porcelain` was empty, and the suite read 83 passed, 0 failed. The clean-tree case (step 7 alone) is held by its own committed test in the same suite.

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
Measured on head: +3.4% wall, -1.7% suite time at the median of five alternating pairs, against a 10% bound.

### Reliability — PASS
No code changed. The ordered route is now held by a committed test that goes red when the order flips.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (the `/finalise` run 2 probe plan ran 44, 0 reproduced; this cycle adds no code)
- Boundary: `internal`.

### Maintainability — PASS
T276-QA-6 and T276-QA-7 stay advisory.

---

## Code Review

No code changed since gate 4. Not run.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `reenter-qa-after-finalise.test.sh` (after restore) | PASS — 83 passed, 0 failed |
| Remote CI-parity `test` runs (ten, above) | PASS — all exited 0 |
| PR CI on `948f5f6e9` | PASS — all six checks |

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
CI=true npm run test:remote -- --run test
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
**Rationale**: Both `/finalise` run 2 gaps have committed evidence, and no new finding was raised.
**Quality Score**: 92/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.276.qa.5.halts-and-re-entries-leave-and-read-true-state.md`
**Gate File**: co-located at `task.276.gate.5.halts-and-re-entries-leave-and-read-true-state.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise` run 3.

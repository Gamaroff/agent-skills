# QA Report: Task 296 - test:remote per-run lock and image-tag prune

**Task**: [Link to task document](./task.296.test-remote-per-run-lock-and-image-prune.md)
**Gate File**: [task.296.gate.3.test-remote-per-run-lock-and-image-prune.yml](./task.296.gate.3.test-remote-per-run-lock-and-image-prune.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's two findings are fixed and re-proved by mutation. The reviewer returned nothing, but it finished in 9 seconds, so I did not rely on that: probing the new margin argument with the engine found one low-impact defect. The digits check lets through a leading zero (an octal crash) and a 22-digit value (a silent wrap). The shipped caller cannot send either, but a validator that accepts what its consumer cannot read is a defect.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL on T296-QA-5 and CI green on the final head

---

## Testing Scope

### Review Methodology

- Direct tools plus one read-only Explore reviewer over the scoped patch. Route: Diff review: code review.
- Re-review scope: files changed since gate 2 (head 2c9fe694f76c; 3 code files) — default. The scoped patch is those files' whole branch diff (1008 lines).
- Reviewer: returned `findings: []`, `reviewed` naming the patch, `lockctl.sh`, the take call in `run.sh` and the new test. Duration from the completion notice: 9180 ms, 3 tool uses. A fast empty list is a weak claim about the instrument, so the independence it adds is limited and the checks below were run directly.
- Step 4b: not applicable, no runnable prose in the change set.
- CI on 793abc01c024: pending when the gate was written (recorded, not waited on). The earlier red `link-check` (T296-QA-4) was on 2c9fe694f76c.

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| T296-QA-3: take ignores the lock margin | FIXED. Mutation proofs below. A held take at margin 0 reports `state=stale`, at the default `state=live`, and `unlock` at 0 agrees. |
| T296-QA-4: CI link-check red | FIXED in the report (the host-at-address string is in backticks). Confirmation needs CI on the new head, which was pending. |

## New Findings This Cycle

- **[low]** `scripts/remote-test/lockctl.sh` — the margin (and timeout) digits check accepts `08` and a 22-digit value, which the arithmetic then misreads → cap at 4 digits and read with `10#` (T296-QA-5).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The lock | CONCERNS | Verified | the margin now reaches take; its validator is loose (T296-QA-5) |
| Phase 2: The image prune | PASS | Verified | unchanged |
| Phase 3: Tests and acceptance | PASS | Verified | 47/47; `ci:fast` on the server green on the fixed tree (8430 pass, 0 fail) |
| Phase 4: Docs | PASS | Verified | the docs say the margin applies to the stale test; now true for take as well |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Success Criteria Verification

Unchanged from cycle 2 and holding: `criteria-drift` clean, CHANGELOG cites task 296, 47/47 offline tests (also under `CI=true`), shellcheck and prettier clean.

---

## Breaking Changes Validation

None documented, none found. **Assessment:** PASS (not applicable).

---

## Issues Found

### LOW Severity Issues (1)

**T296-QA-5: the digits check does not match what the arithmetic can read**
- **Observation**: `take`, and before it `unlock`, check a number with a digits-only pattern. The staleness sum then runs in bash arithmetic, where a leading zero means octal and 64 bits wrap.
- **Reproduction** (real `lockctl.sh`, fake docker, temp HOME): `take … 08` prints `value too great for base (error token is "08")` and no state, exit 10. `take … 9999999999999999999999` reports `state=live`. Engine run: 18 executed, 4 reproduced in bash and zsh, 1 escaped.
- **Control**: the other 7 hostile margins are rejected with exit 2; margins 0 and 10 behave.
- **Impact**: only a caller other than `run.sh` can send either, because `run.sh` caps at 4 digits and normalises with `10#`. Hence low. Origin: QA probe, reproduced. Not a base issue: the file is new.
- **Recommendation**: validate `^[0-9]{1,4}$` for timeout and both margins, read with `10#`, add a committed test.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
Advisory CR-3 to CR-6 from cycle 1 stand.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 18 (`task.296.qa.3.security.run.json`; `escaped` 1, `reproduced` 4)
- The take control for the margin is hostile-only, so its verdict reads `present-but-inert`: the legitimate half would write a lock under the shared HOME. The escape is that same lock, written because the input was wrongly accepted. Cycle 1's record (38 probes, 0 escaped) still describes the run-directory validator, which this cycle did not change.

### Maintainability — PASS
One server-side file, shellcheck clean, documented.

---

## Code Review

Diff review: code review. The reviewer returned no findings, so no anchors to check.

**Correctness bugs (0 from the reviewer; 1 found by QA's probe):**
- [low] `scripts/remote-test/lockctl.sh` take margin check — see T296-QA-5.

**Cleanups (0):** none.

mutation-proven: `run.sh` stops sending the margin → `the take carries the run's own timeout, and every argument is one word` went red → covered
mutation-proven: `take` ignores its margin (`describe` fixed at 10) → `lockctl take on a held lock judges staleness by the margin it is given, as unlock does (T296-QA-3)` went red → covered
mutation-proven: the `bad margin` check removed → the same test went red → covered
Run with nothing else reading the tree; restored with `cmp` against `cp` snapshots; the working tree matched its state before the step.

---

## Regression Testing

47 offline tests pass; the 23 pre-existing runner tests pass unchanged.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/test-remote-runner.test.js      # 47 pass
security-probe.mjs --sink filename --entry shell-argv:scripts/remote-test/lockctl.sh --argv '["take",...,"{input}"]' --cases-file lockctl-margin.cases.json
qa-ci-read.sh --vcs github --pr 891                       # CI_SUMMARY pending
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T296-QA-5, with a committed test.

### Short-term Actions (Non-Blocking)
1. Advisory CR-3 to CR-6 as a follow-up task if wanted.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL on T296-QA-5 and CI green on the final head.

**QA Report**: co-located at `task.296.qa.3.test-remote-per-run-lock-and-image-prune.md`
**Gate File**: co-located at `task.296.gate.3.test-remote-per-run-lock-and-image-prune.yml`
**Next Steps**: `/qa-fix` T296-QA-5, then QA cycle 4.

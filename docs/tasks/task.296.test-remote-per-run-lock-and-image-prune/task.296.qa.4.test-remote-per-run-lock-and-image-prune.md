# QA Report: Task 296 - test:remote per-run lock and image-tag prune

**Task**: [Link to task document](./task.296.test-remote-per-run-lock-and-image-prune.md)
**Gate File**: [task.296.gate.4.test-remote-per-run-lock-and-image-prune.yml](./task.296.gate.4.test-remote-per-run-lock-and-image-prune.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-12
**Gate Status**: PASS

---

## Executive Summary

Cycle 3's one finding (T296-QA-5) is fixed. The scoped change is 121 lines in two files and I read all of it. I found no defect: the caps match the ones `run.sh` already applies, and every arithmetic read of an owner-file value is now decimal and length-bounded.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY once CI is green on the final head

---

## Testing Scope

### Review Methodology

- Direct tools only. Cycle 3's Explore reviewer returned nothing in 9 seconds, so I did not dispatch another for a 121-line diff and read the change myself. **Independent review did not run this cycle.** Route: Diff review: code review (inline).
- Re-review scope: files changed since gate 3 (head 793abc01c024): `scripts/remote-test/lockctl.sh` and `tests/test-remote-runner.test.js`. `SAFETY_REPROBE` false.
- Step 4b: not applicable, no runnable prose in the change set.
- CI on 2f9f1db90a7a: pending when the gate was written (recorded, not waited on). The server `ci:fast` gate on the same tree was green: 8431 pass, 0 fail.

---

## Re-Review Context

| Previous finding | Status |
| --- | --- |
| T296-QA-5: digits check accepts a leading zero and 22 digits | FIXED. Probe: 22 digits and five digits now exit 2 with no lock written. Margin `08` is now valid decimal 8. |

## New Findings This Cycle

None.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The lock | PASS | Verified | caps and decimal reads consistent across `take`, `unlock`, `lock_state`, `describe` |
| Phase 2: The image prune | PASS | Verified | unchanged |
| Phase 3: Tests and acceptance | PASS | Verified | 48/48, also under `CI=true`; server `ci:fast` 8431 pass |
| Phase 4: Docs | PASS | Verified | unchanged and still accurate |

**Overall Phase Completion**: 4/4 PASS

---

## Success Criteria Verification

`criteria-drift` clean, CHANGELOG cites task 296, shellcheck and prettier clean.

---

## Breaking Changes Validation

None documented, none found. A margin or timeout of five digits or more is now refused by `lockctl.sh`; `run.sh` already refused it, so the shipped caller sees no change. **Assessment:** PASS.

---

## Issues Found

None. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS (advisory)
CR-3 to CR-6 from cycle 1, not reproduced, in the gate's `recommendations.future`.

### Security — PASS

- **Evidence**: measured
- **Probes executed**: 20 (`task.296.qa.4.security.run.json`; 0 reproduced, 0 escaped, 0 overblocked)
- The control for the margin is hostile-only, so the engine's verdict is `unverifiable`: there is no legitimate half that would not write a lock under the shared HOME. That is the same limit as cycles 1 and 3.

### Maintainability — PASS
Every digit validator in `lockctl.sh` now follows one rule.

---

## Code Review

Diff review: code review, done inline. Read: the whole `lockctl.sh` diff since gate 3, the `run.sh` caps at lines 96–99 (`{1,4}`, normalised with `10#`), and the new test.

**Correctness bugs (0).** Checked and found sound: `[[ … ]] && echo` in `describe` returns non-zero on no match but the next line runs regardless (the script uses `set -uo pipefail`, not `-e`); the 12-digit and 9-digit bounds leave room for the sum; four digits for a timeout is the cap `run.sh` applies.

**Cleanups (0).**

mutation-proven: both margin caps and the timeout cap relaxed one at a time → the T296-QA-5 test went red each time → covered
mutation-proven: `10#` dropped from the staleness sum, and from the age line → the same test went red → covered
Run on a tree nothing else was reading; restored with `cmp` against `cp` snapshots.

---

## Regression Testing

48 offline tests pass; the 23 pre-existing runner tests pass unchanged.

---

## Test Artifacts

```bash
command node --test tests/test-remote-runner.test.js      # 48 pass
npm run test:remote                                        # 8431 pass, 0 fail (server)
security-probe.mjs --sink filename --entry shell-argv:scripts/remote-test/lockctl.sh --argv '["take",...,"{input}"]' --cases-file lockctl-margin4.cases.json
qa-ci-read.sh --vcs github --pr 891                        # CI_SUMMARY pending
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Advisory CR-3 to CR-6 as a follow-up task if wanted.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: READY once CI is green on the final head.

**QA Report**: co-located at `task.296.qa.4.test-remote-per-run-lock-and-image-prune.md`
**Gate File**: co-located at `task.296.gate.4.test-remote-per-run-lock-and-image-prune.yml`
**Next Steps**: `/review-pr` (Step 5c, the loop's exit gate).

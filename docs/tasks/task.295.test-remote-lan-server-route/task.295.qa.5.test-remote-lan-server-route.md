# QA Report: Task 295 - Run the test suite on the LAN server (test:remote)

**Task**: [Link to task document](./task.295.test-remote-lan-server-route.md)
**Gate File**: [task.295.gate.5.test-remote-lan-server-route.yml](./task.295.gate.5.test-remote-lan-server-route.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: CONCERNS

---

## Executive Summary

Gate 4's finding is addressed: the container-name check is now described as a best-effort guard. The scoped review found no code defect. One medium finding is left, and it is wording: the documented window ("a few seconds") is wrong, and the pointer to Future Improvements names a different feature. This is the last gate in the loop budget; the wording fix is read by the Step 5c review.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Re-review, cycle 5. Re-review scope: files changed since gate 4 (head `d602cdea`; 3 files: `run.sh`, the guard test, `testing-remote.md`), default scoping. A dispatched read-only reviewer read them (28 s, completion notice). Step 4b: not applicable. CI on 19108b838392: none.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T295-QA-9 the lock covers the run, not the sync | PARTIAL | the claim is now scoped to a best-effort guard in `run.sh` and the doc; the stated window is wrong (T295-QA-10) |

---

## New Findings This Cycle

- **[medium]** `docs/contributing/testing-remote.md:34`: the window is minutes, not a few seconds, and a later run's sync can rewrite the earlier run's tree (T295-QA-10).
- **[low]** `scripts/remote-test/run.sh:144`: the Future Improvements pointer names the cross-repository lock (in recommendations.future).
- **[low]** `tests/test-remote-runner.test.js:353`: the test title still says "lock check" (in recommendations.future).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Decisions | PASS | |
| 1 Runner | PASS | |
| 2 Container and sync | PASS | |
| 3 Guard test | PASS | 19 of 19 |
| 4 Docs | CONCERNS | window wording (T295-QA-10) |
| 5 Acceptance | PASS | |

**Overall Phase Completion**: 6/6

---

## Success Criteria Verification

Unchanged; criteria drift clean; CHANGELOG cites task 295.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T295-QA-10: the guard's window is stated wrongly.** It spans the whole sync and a first-use image build (minutes), and a later run's `rsync --delete` can rewrite the earlier run's tree. Reword; cite a per-run lock item, not the cross-repository one.

### LOW Severity Issues (2, in recommendations.future)

### HIGH Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance: PASS
### Reliability: PASS
Every earlier reliability finding is fixed and held by a mutation-proved test.
### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged: the `--run` validation is the boundary; the probe corpus does not fit this entry.

### Maintainability: PASS

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `docs/contributing/testing-remote.md:34` — window wording (T295-QA-10).

**Cleanups (2):**
- `scripts/remote-test/run.sh:144` — pointer to the wrong Future Improvements item.
- `tests/test-remote-runner.test.js:353` — test title says "lock check".

---

## Test Artifacts

```bash
CI=true node --test tests/test-remote-runner.test.js
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL (reword the guard window, T295-QA-10)

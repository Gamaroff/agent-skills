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

## Acceptance runs (re-run during `/finalise`, 2026-11-10)

The first full `ci:fast` run on the final tree came after the QA loop, during `/finalise`. Each run is `npm run test:remote` from a clean clone of the pushed branch, and the laptop process list was sampled every 20 s while it ran.

| Run | Head | Exit | Result |
| --- | --- | --- | --- |
| Green 1 | `80781138` | 1 | 8365 tests, 1 fail: `no test file hardcodes a spawn timeout` (`tests/test-remote-runner.test.js` carried `timeout: 5000`). A real defect, fixed in `13486822` by taking the timeout from the shared spawn budget; reverting that change turns the guard red |
| Green 2 | `13486822` | 0 | 8365 tests, 8362 pass, 0 fail, 3 skipped, 7 m 04 s |
| Red | scratch commit, one assertion changed in a throwaway clone on a scratch branch (never on the PR branch; the clone was discarded) | 1 | 8365 tests, 1 fail: `a --run name with shell metacharacters exits 2 before any ssh`; the failure is in the output |

Load, from `uptime`:

| Run | Laptop before | Laptop after | .249 before | .249 after |
| --- | --- | --- | --- | --- |
| Green 1 | 0.51 0.52 1.28 | 0.29 0.27 0.75 | 3.63 6.13 8.81 | 11.78 16.11 12.55 |
| Green 2 | 0.46 0.31 0.74 | 2.33 1.92 1.48 | 14.53 16.20 12.72 | 6.23 13.43 14.22 |
| Red | 2.33 1.95 1.50 | 0.97 1.65 1.56 | 4.53 12.45 13.88 | 5.06 6.95 10.45 |

.249 was busy for the whole session (another user on a shared host), so its figures say nothing about this route. The laptop stayed near idle.

Laptop process list during the runs: 31, 38 and 24 samples. Every sample showed only `ssh` (and its `timeout` wrapper). One sample in green 2 matched `bash shared/resources/advance-pipeline-lock.test.sh`, which is another session's script in this checkout, not something the route started; no `node --test` and no `ci:fast` process ran locally. Green 2 printed 87 `PASS ... zsh` lines and no zsh or awk skip notice. After each run no `agent-skills-test` container was left on .249.

## Test Artifacts

```bash
CI=true node --test tests/test-remote-runner.test.js
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL (reword the guard window, T295-QA-10)

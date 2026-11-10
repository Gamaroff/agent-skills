# QA Report: Task 295 - Run the test suite on the LAN server (test:remote)

**Task**: [Link to task document](./task.295.test-remote-lan-server-route.md)
**Gate File**: [task.295.gate.4.test-remote-lan-server-route.yml](./task.295.gate.4.test-remote-lan-server-route.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: CONCERNS

---

## Executive Summary

The gate-3 findings are fixed: the lock is checked before the sync, a dropped ssh kills the container, `--reap` aborts when `docker ps` fails, and each fix is held by a test that a mutation turns red. The scoped review found no high or reproduced defect. One medium finding remains: the lock only covers the running container, not the sync and image build before it, and the docs call it more than it is.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Re-review, cycle 4. Re-review scope: files changed since gate 3 (head `12578cea`; 3 files: `run.sh`, the guard test, `testing-remote.md`), default scoping. A dispatched read-only reviewer read them (41 s, completion notice). Step 4b: not applicable. CI on d602cdea1d06: none.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T295-QA-6 lock taken after the sync | FIXED | lock check before the first rsync; live run on .249 with a container holding the name exits 1 before any sync; mutation-proved. The residual window is T295-QA-9 |
| T295-QA-7 dropped ssh leaves the container | FIXED | 255 kills the named container, 125 does not; mutation-proved |
| T295-QA-8 failing `docker ps` makes reap delete | FIXED | reap aborts; the directory is touched after the sync; mutation-proved |

---

## New Findings This Cycle

- **[medium]** `scripts/remote-test/run.sh:142`: the lock does not cover the sync and image build (T295-QA-9).
- **[low]** `run.sh:189` touch chained as `(touch && inspect) || build`; test stub ignores the docker filter; touch-order test matches substrings only (all in recommendations.future).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Decisions | PASS | |
| 1 Runner | CONCERNS | T295-QA-9 |
| 2 Container and sync | PASS | |
| 3 Guard test | PASS | 17 of 17 |
| 4 Docs | CONCERNS | the lock wording overstates it |
| 5 Acceptance | PASS | |

**Overall Phase Completion**: 6/6

---

## Success Criteria Verification

Unchanged; criteria drift clean; CHANGELOG cites task 295.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T295-QA-9: the lock has a window before the container exists.** A run that is still syncing or building holds no lock, so a second run on the branch passes the check. The fix is to scope the claim (best-effort guard; real lock is the task's Future Improvements item), not to add a fourth mechanism: this is the third gate on the lock.

### LOW Severity Issues (3, in recommendations.future)

### HIGH Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance: PASS
### Reliability: CONCERNS
T295-QA-9.
### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged: the `--run` validation is the boundary; the probe corpus does not fit this entry.

### Maintainability: PASS

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `scripts/remote-test/run.sh:142` — lock window (T295-QA-9).
- [low/medium] `scripts/remote-test/run.sh:189` — touch chained before `||` (advisory).
- [low/medium] `tests/test-remote-runner.test.js:41` — stub ignores the docker filter (advisory).
- [low/medium] `tests/test-remote-runner.test.js:366` — touch-order test checks substrings (advisory).

---

## Test Artifacts

```bash
CI=true node --test tests/test-remote-runner.test.js
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL (scope the lock claim, T295-QA-9)

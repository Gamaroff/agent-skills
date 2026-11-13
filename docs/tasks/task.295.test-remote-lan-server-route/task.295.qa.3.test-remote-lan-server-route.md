# QA Report: Task 295 - Run the test suite on the LAN server (test:remote)

**Task**: [Link to task document](./task.295.test-remote-lan-server-route.md)
**Gate File**: [task.295.gate.3.test-remote-lan-server-route.yml](./task.295.gate.3.test-remote-lan-server-route.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

The gate-2 findings are fixed and each fix is held by a test that a mutation turns red; the timeout now stops the container on the server (live run on .249). The scoped review of that fix found that it is incomplete in three places: the lock is taken after the sync it protects, a dropped ssh leaves the container running, and a failing `docker ps` lets `--reap` delete a live directory.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Re-review, cycle 3. Re-review scope: files changed since gate 2 (head `7dd8e0a8`; 3 files: `run.sh`, the guard test, `testing-remote.md`), default scoping. A dispatched read-only reviewer read them (duration 60 s, completion notice); its anchors were checked by grep (lines 112, 154, 192, 194, 196). Step 4b: not applicable. CI on 12578cea0f47: none (no checks run on this branch).

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T295-QA-3 timeout leaves the remote container | FIXED | `timeout` inside a named `--init` container plus a local `docker kill` backstop; live run on .249: `--timeout-min 1` exit 124 after 80 s, 0 containers left; mutation-proved |
| T295-QA-4 branch key collisions | FIXED | slug plus hash; detached keys on the commit; mutation-proved. The lock half is T295-QA-6 |
| T295-QA-5 reap reads a stale mtime | PARTIAL | reap skips a running container and a run touches its directory; the failing-docker case and the touch timing remain (T295-QA-8) |

---

## New Findings This Cycle

- **[high]** `scripts/remote-test/run.sh:154`: the lock is taken after the sync (T295-QA-6).
- **[medium]** `scripts/remote-test/run.sh:196`: a dropped ssh leaves the container running; a stale named container blocks later runs (T295-QA-7).
- **[medium]** `scripts/remote-test/run.sh:112`: a failing `docker ps` makes `--reap` delete live directories, reproduced (T295-QA-8).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Decisions | PASS | |
| 1 Runner | CONCERNS | T295-QA-6, 7, 8 |
| 2 Container and sync | CONCERNS | lock ordering |
| 3 Guard test | PASS | 13 of 13 |
| 4 Docs | CONCERNS | the lock claim is wrong until T295-QA-6 is fixed |
| 5 Acceptance | PASS | cycle 1 evidence, plus the live timeout run |

**Overall Phase Completion**: 6/6

---

## Success Criteria Verification

Unchanged from cycle 1; criteria drift clean; CHANGELOG cites task 295.

---

## Issues Found

### HIGH Severity Issues (1)

**T295-QA-6: the lock is taken after the sync.** `rsync --delete` (run.sh:154) and the image build run before `docker run` (:187), so a second run on a branch rewrites a live run's tree and then fails on the name.

### MEDIUM Severity Issues (2)

**T295-QA-7: a dropped ssh (255) leaves the container; a stale named container blocks later runs.**
**T295-QA-8: a failing `docker ps` makes `--reap` delete a live directory.** Repro: docker stub exits 1, a 40-day-old directory is removed. Control: with a docker that lists the name, the directory is kept.

### LOW Severity Issues (4, in recommendations.future)

Trap deferral and kill-by-name (not reproduced); the 124/137 message; the 9999-minute cap; test coverage of the new paths.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 4

---

## NFR Assessment

### Performance: PASS
### Reliability: CONCERNS
T295-QA-6, 7, 8.
### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged: the `--run` validation is the boundary and its probe corpus does not fit; the new code splices only a sanitised slug, a hex hash and validated integers.

### Maintainability: PASS

---

## Code Review

**Correctness bugs (5):**
- [high/high] `scripts/remote-test/run.sh:154` — lock taken after the sync (T295-QA-6).
- [medium/high] `scripts/remote-test/run.sh:196` — 255 and stale-container paths (T295-QA-7).
- [medium/medium] `scripts/remote-test/run.sh:112` — failing `docker ps` in reap (T295-QA-8, reproduced).
- [medium/medium] `scripts/remote-test/run.sh:192` — trap deferral; not reproduced, advisory.
- [medium/high] `scripts/remote-test/run.sh:196` — 124 and 137 share a message; advisory (a kill of a missing container is a no-op).

**Cleanups (2):** the 9999-minute cap; test coverage of the new paths.

---

## Test Artifacts

```bash
CI=true node --test tests/test-remote-runner.test.js
bash --version >/dev/null; reap script run with a docker stub that exits 1
```

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 65/100
**Deployment Recommendation**: BLOCKED (fix T295-QA-6, 7, 8)

# QA Report: Task 295 - Run the test suite on the LAN server (test:remote)

**Task**: [Link to task document](./task.295.test-remote-lan-server-route.md)
**Gate File**: [task.295.gate.2.test-remote-lan-server-route.yml](./task.295.gate.2.test-remote-lan-server-route.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's two findings are fixed and held: a missing `--host` or `--timeout-min` value now exits 2, a committed guard test fails on the old script, and the CHANGELOG cites task 295. The cycle-2 refute pass over the whole branch then found a high defect that no earlier check could see: the run timeout does not stop the remote container. Three medium findings came with it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Re-review, cycle 2: the whole branch diff, reviewed to refute (a dispatched read-only reviewer that did not write the code, given the refute directive). Re-review scope: unscoped whole-branch diff (cycle 2 is always a full refute pass). Direct tools for the rest. Reviewer duration 44 s (completion notice). The reviewer's anchors were checked by grep against `run.sh` (lines 75, 106, 112, 113, 162 all match); the `finding-anchors.js` checker was not run. Step 4b: not applicable, no runnable prose in the change set.

CI on 7dd8e0a8c811: none (the repository runs no check on this branch yet).

Re-review context: `git status` shows other sessions' uncommitted edits outside this task (shared resources, skills, CHANGELOG hunks). They are not in this review.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T295-QA-1 missing option value hangs `run.sh` | FIXED | `--host` and `--timeout-min` with no value exit 2; guard test 8/8; the old script turns it red (`got null (signal SIGTERM)`), commit `7dd8e0a8` |
| T295-QA-2 no CHANGELOG entry | FIXED | `changelog-cites.sh task.295` prints `cites (task 295)` |

---

## New Findings This Cycle

- **[high]** `scripts/remote-test/run.sh:162`: the timeout leaves the remote container running (T295-QA-3).
- **[medium]** `scripts/remote-test/run.sh:112-113`: lossy, unlocked per-branch key; detached HEAD collides (T295-QA-4).
- **[medium]** `scripts/remote-test/run.sh:106`: `--reap` reads a directory mtime that rsync overwrites with the source's (T295-QA-5).
- **[low]** `scripts/remote-test/run.sh:75`: `--timeout-min 08` is refused with an octal error (recommendations.future).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Decisions | PASS | Recorded in task Notes |
| 1 Runner | CONCERNS | Option parsing fixed; timeout, key and reap findings above |
| 2 Container and sync | CONCERNS | Container has no name and no in-container timeout |
| 3 Guard test | PASS | 8/8 offline tests pass |
| 4 Docs | PASS | The docs claim a bounded run, which T295-QA-3 shows is not true of the container |
| 5 Acceptance | PASS | Cycle 1 evidence stands |

**Overall Phase Completion**: 6/6

---

## Success Criteria Verification

The server-only evidence is the developer's, restated in cycle 1 (green clean-clone run, 8353 tests, 0 fail; red run exits 1; bad `--run` exits 2; unreachable server exits 1; `CpuShares=128`). Not repeated here. Criteria drift: clean. CHANGELOG citation: present.

---

## Issues Found

### HIGH Severity Issues (1)

**T295-QA-3: the timeout does not stop the remote container**
- Repro on .249 with the real image: `timeout --foreground -k 1m 5 ssh ci@192.168.1.249 "docker run --rm --name qa295-probe --cpu-shares 128 agent-skills-test:1faa1e88a8b6 sleep 120"` returned 124. Three seconds later `docker ps` still listed `qa295-probe`, `Up 7 seconds`. Killed by hand; `docker ps -a` then listed 0.
- Why: the run has no tty and no in-container timeout, and `timeout` signals only the local ssh client.
- Base comparison: not applicable, the file is new.
- Fix: name the container per run, run the scripts under `timeout` inside it or `docker kill` on exit, add `--init`; add a guard test.

### MEDIUM Severity Issues (2)

**T295-QA-4: lossy per-branch key, no lock.** Repro: `feature/foo`, `feature-foo` and `Feature/Foo` all give `feature-foo`; a detached HEAD gives `HEAD` with exit 0, so the `detached` fallback is dead.

**T295-QA-5: `--reap` reads a stale mtime.** Repro: a source directory dated 40 days ago synced with `rsync -a` gives a destination dated 40 days ago. The deletion was not run against the live server. Reviewer rated high; re-rated medium (explicit operator command, removes a re-creatable cache).

### LOW Severity Issues (2)

- `--timeout-min 08` exits 2 with a bash octal error and a misleading message (reproduced); no upper bound.
- `docs/contributing/testing-remote.md` step 4 omits shellcheck, rsync and the trixie base.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance: PASS
`--cpu-shares 128` confirmed in cycle 1.

### Reliability: CONCERNS
T295-QA-3, T295-QA-4, T295-QA-5.

### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The `--run` validation is a boundary (criteria signal `never`). The probe engine's corpus does not fit this entry, so it is not credited. The refute pass found no injection path into the remote command.

### Maintainability: PASS
shellcheck clean; guard test 8/8.

---

## Code Review

**Correctness bugs (4):**
- [high/high] `scripts/remote-test/run.sh:162` — timeout kills only the local ssh client; remote container survives → name it, bound it inside, kill on exit (T295-QA-3, reproduced).
- [high/medium] `scripts/remote-test/run.sh:106` — `--reap` keys on a directory mtime rsync overwrites (T295-QA-5; severity re-rated to medium, original high).
- [medium/high] `scripts/remote-test/run.sh:113` — slug collisions and no lock (T295-QA-4, reproduced).
- [medium/high] `scripts/remote-test/run.sh:112` — detached HEAD key is `head` (T295-QA-4, reproduced).

**Cleanups (1):**
- `scripts/remote-test/run.sh:75` — octal-sensitive numeric test (recommendations.future, reproduced).

---

## Regression Testing

The cycle-1 fix touched only argument parsing; the other seven guard tests still pass.

---

## Test Artifacts

```bash
CI=true node --test tests/test-remote-runner.test.js
timeout --foreground -k 1m 5 ssh ci@192.168.1.249 "docker run --rm --name qa295-probe --cpu-shares 128 <image> sleep 120"
bash .agents/skills/qa-task/references/changelog-cites.sh task.295
```

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 65/100
**Deployment Recommendation**: BLOCKED (fix T295-QA-3, T295-QA-4, T295-QA-5)

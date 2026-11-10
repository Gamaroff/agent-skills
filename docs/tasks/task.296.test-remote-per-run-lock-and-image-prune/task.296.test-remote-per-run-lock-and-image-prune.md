---
id: task.296
title: "test:remote per-run lock and image-tag prune"
type: task
description: "Replace the best-effort container-name guard in test:remote with an atomic per-run lock on the server, and add a bounded prune of old agent-skills-test image tags."
tags: [infrastructure, testing, developer-tooling, remote-test]
category: infrastructure
status: planned
priority: Low
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: test:remote per-run lock and image-tag prune

**Status:** Planned

Follow-up to task.295 (PR #872). Both items are listed in task.295's Future Improvements and in `docs/contributing/testing-remote.md`.

---

## 1. Overview

Two small hardening items for `npm run test:remote`:

1. **A per-run lock.** An atomic `mkdir` of a lock directory on the server, taken before the sync and released when the run ends, replaces the container-name check in `scripts/remote-test/run.sh` as the thing that stops two runs on one branch.
2. **An image-tag prune.** A new bounded option removes old `agent-skills-test:*` image tags on the server, next to the existing `--reap` for directories.

**Key deliverables:** the lock in `run.sh`, the prune option, offline guard tests for both, and the doc updated to say what is now held.

**Expected outcome:** two runs on one branch cannot overlap at any point of the sync, and old image tags stop accumulating.

## 2. Motivation

- **The guard has a window of minutes.** The check at `scripts/remote-test/run.sh:146` (`docker ps -a … --filter name=^/${RUN_DIR}$`) runs before the sync. A second run started inside the window, which is the whole sync plus a first-use image build, is not stopped; its `rsync --delete` can rewrite the tree under the first run. Task.295's QA gates 3 to 5 found three edges of this one mechanism, and the claim was scoped to "best-effort" rather than patched a fourth time.
- **Image tags accumulate.** The tag is `agent-skills-test:<sha256 of the Dockerfile, 12 chars>` (`run.sh:192`). Every Dockerfile change leaves the previous tag on the server. `--reap` removes directories only.
- The server is shared with other users and a gaming PC, so cleanup must be narrow: no global `docker prune`, nothing outside the `agent-skills-test` repository name.

## 3. Technical Background

**Current state** (each name grepped on 2026-11-10):

- The guard: `scripts/remote-test/run.sh:139-146`, a comment block then `EXISTING=$(ssh … docker ps -a -q --filter name=^/${RUN_DIR}$)`.
- The run directory name: `RUN_DIR="agent-skills-test-${SLUG:-run}-${BRANCH_HASH}"` at `run.sh:135`, under `$HOME` on the server.
- The image step: `run.sh:192-193` (`IMAGE=…`, then `touch "$HOME/$RUN_DIR" && { docker image inspect … || docker build … }`).
- The reap: `run.sh:105-122` (a `ssh … bash -s` with a quoted heredoc, skipping a directory whose container is running).
- The container: `run.sh:207`, `docker run --rm --init --name $RUN_DIR … --cpu-shares 128`, inside a local backstop that `docker kill`s on exit 124, 137 or 255.
- The guard test: `tests/test-remote-runner.test.js`, with a stub `ssh` that matches on the command text (for example `*"docker ps -a"*`).

**Target:**

- **Lock.** `mkdir "$HOME/$RUN_DIR.lock"` over ssh is atomic: it fails if the directory exists. The lock holds a small file with the local host name, the pid and a start time, so a stale lock can be read, not guessed. It is released by an exit trap on the local side, and by the same `ssh` that runs the container when the run ends. The lock is taken **before the sync**, so it covers the whole window. The container-name check stays as a second layer (it also catches a container left behind).
- **A stale lock.** A crashed run, a killed laptop or a lost network leaves the lock behind, which would block that branch forever. The rule: a lock is stale when its container is absent **and** it is older than the run's timeout limit plus a margin; `--unlock` removes one by hand and names what it removed. This is the part that needs care: a lock that cannot be cleared is worse than no lock.
- **Prune.** `--prune-images` lists `agent-skills-test` images, keeps the tag the current Dockerfile names and any tag a running container uses, and removes the rest with `docker rmi` by explicit tag. It never calls `docker image prune` or `docker system prune`.

## 4. Scope

**In scope:**

- ✅ The lock, its release, staleness rule and `--unlock`, in `scripts/remote-test/run.sh` and `server-lib.sh`.
- ✅ `--prune-images`.
- ✅ Offline guard tests (stubbed `ssh` and `rsync`) and a live acceptance run on the server.
- ✅ `docs/contributing/testing-remote.md` and the usage text.

**Out of scope:**

- ❌ A lock across repositories on the server (task.295 Future Improvements keeps that, for if overlapping gates recur).
- ❌ Automatic scheduling of prune or reap.
- ❌ The deferred SIGTERM trap and the 9999-minute cap on `--timeout-min`, which are separate advisory items from task.295.

## 5. Breaking Changes

None. The route's arguments stay valid. Two options are added (`--unlock`, `--prune-images`). A run that used to proceed past a stale container-name check is unchanged; a run blocked by a live lock now exits non-zero with a message naming the lock's owner.

## 6. Implementation Plan

> Detailed guide: [task.296.plan.test-remote-per-run-lock-and-image-prune.md](task.296.plan.test-remote-per-run-lock-and-image-prune.md)

### Phase 1: The lock — Risk: Medium

**Files:** `scripts/remote-test/run.sh`, `scripts/remote-test/server-lib.sh`

- [ ] Take `mkdir "$HOME/$RUN_DIR.lock"` over ssh before the sync; on failure read the owner file and exit non-zero, naming owner and age.
- [ ] Write the owner file (host, pid, start time) into the lock directory.
- [ ] Release on every local exit path with a trap, and verify the release failure is reported, not swallowed.
- [ ] Staleness rule and `--unlock`.
- [ ] Keep the container-name check as the second layer.

**Dependencies:** none.

### Phase 2: The image prune — Risk: Low

**Files:** `scripts/remote-test/run.sh`

- [ ] `--prune-images`: list tags of the `agent-skills-test` repository only.
- [ ] Keep the current tag and any tag a running container uses; remove the rest with `docker rmi <repo:tag>`.
- [ ] Refuse and exit non-zero when `docker ps` fails, as `--reap` does.

**Dependencies:** none (independent of Phase 1).

### Phase 3: Tests and acceptance — Risk: Low

**Files:** `tests/test-remote-runner.test.js`

- [ ] Offline tests for each new behaviour, each mutation-proved.
- [ ] A live two-run overlap on the server, and a live prune, both recorded in the QA report.

**Dependencies:** Phases 1 and 2.

### Phase 4: Docs — Risk: Low

**Files:** `docs/contributing/testing-remote.md`, `CHANGELOG.md`

- [ ] Replace the "best-effort guard" wording with what the lock holds and what it does not.
- [ ] Document `--unlock` and `--prune-images`.

**Dependencies:** Phases 1 and 2.

## 7. Files Summary

**Core implementation:**

1. ✅ `scripts/remote-test/run.sh` — lock, `--unlock`, `--prune-images`
2. ✅ `scripts/remote-test/server-lib.sh` — lock helpers if they belong beside `server_ready`

**Tests:**

3. ✅ `tests/test-remote-runner.test.js` — new cases (the timeout comes from `spawnBudget`, never a literal; the repo guard `tests/test-harness-concurrency.test.js` rejects one)

**Documentation:**

4. ✅ `docs/contributing/testing-remote.md`
5. ✅ `CHANGELOG.md`

## 8. Testing Strategy

**Unit (offline, stubbed `ssh` and `rsync`):**

- A held lock stops the run before any `rsync`, names the owner and exits non-zero.
- A free lock is taken, written with an owner and released on a normal exit, on a failing run and on SIGINT.
- A stale lock is refused by a run and removed by `--unlock`; a live lock is not removed by a run.
- `--prune-images` issues `docker rmi` only for `agent-skills-test` tags other than the current one and those in use, and never `prune`.
- Every test that spawns takes its timeout from `spawnBudget` and removes its temp directory (`scripts/test-tmpdir.mjs` rejects a leaking prefix).

**Mutation:** for each, remove the behaviour (the `mkdir`, the release, the keep-current rule) and confirm a test goes red. A second-layer test must defeat the first layer on its own: one test must hold the lock with **no** container present.

**Live (on the server, recorded in the QA report):** two runs started together on one branch, where the second must refuse; a stale lock cleared with `--unlock`; a prune that removes an old tag and keeps the current one. `uptime` on both hosts before and after each. Run the full `npm run test:remote` on the final tree after **every** fix, not only the guard file (the lesson of task.295).

## 9. Success Criteria

**Functional**

- [ ] Two overlapping runs on one branch: the second exits non-zero before its sync, names the first run, and the first run is not disturbed. The overlap run is recorded in the QA report.
- [ ] A crashed run's lock is cleared by `--unlock`, and a live run's lock is not removed by it. Recorded in the QA report.
- [ ] `--prune-images` removes an old `agent-skills-test` tag and keeps the current tag and any in use; it never calls a global prune. Recorded in the QA report.
- [ ] No existing option's behaviour changes.

**Performance**

- [ ] The lock adds at most one ssh round trip to a run. The extra round trips are counted from the stub's call log in a test, not timed.
- [ ] Load on both hosts is recorded before and after the live runs in the QA report (`uptime`).

**Code quality**

- [ ] `npm run lint:shell` and `format:check` pass on the changed files.
- [ ] The offline guard passes under `CI=true`.
- [ ] `npm run ci:fast` is green on the final tree, run via `npm run test:remote`.

**Migration**

- [ ] `docs/contributing/testing-remote.md` states what the lock holds and its staleness rule, and no longer calls the guard best-effort. `CHANGELOG.md` has an entry citing task 296.

## 10. Risk Assessment

**High**

1. **A stale lock blocks a branch.** Probability: medium. Impact: a developer cannot run tests until `--unlock`. Mitigation: the staleness rule, `--unlock`, and a refusal message that names the owner, the age and the fix. Rollback: remove the lock directory by hand.

**Medium**

2. **The lock leaks on a local kill.** A SIGKILL on the laptop skips the trap. Mitigation: staleness, not a perfect release.
3. **A prune removes a tag a run needs.** Mitigation: keep the current tag and tags of running containers; remove by explicit tag only; refuse when `docker ps` fails.

**Low**

4. **The server is shared**, so a heavy live test can slow someone else. Mitigation: the route already runs at a low CPU weight; keep live runs few and record load.

## 11. Rollback Plan

**Immediate (under 1 hour):** revert the commit. The lock is a directory under `$HOME` on the server; remove any `agent-skills-test-*.lock` directories by hand.

**Partial:** the lock and the prune are independent phases; either can be reverted alone.

**Forward fix:** a refusal message that is wrong or a staleness margin that is too tight is fixed forward.

**Triggers:** Critical: a lock that cannot be cleared, or a prune that removes a tag in use. Non-critical: wording, margins.

---

## Stakeholder Sign-off

Not required for this task.

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: The lock
- [ ] Phase 2: The image prune
- [ ] Phase 3: Tests and acceptance
- [ ] Phase 4: Docs

## References

- task.295 (`docs/tasks/task.295.test-remote-lan-server-route/`), Future Improvements and QA gates 3 to 5
- `docs/contributing/testing-remote.md`, step 4

## Notes

QA artifacts land beside this file: `task.296.qa.N.*.md`, `task.296.gate.N.*.yml`, bug reports `task.296.bug.N.*.md`.

---
id: task.296
title: "test:remote per-run lock and image-tag prune"
type: task
description: "Replace the best-effort container-name guard in test:remote with an atomic per-run lock on the server, and add a bounded prune of old agent-skills-test image tags."
tags: [infrastructure, testing, developer-tooling, remote-test]
category: infrastructure
status: ready-for-review
priority: Low
created: 2026-11-10
updated: 2026-11-12
estimated_effort_hours: 4
---

# Technical Task: test:remote per-run lock and image-tag prune

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.296.review.1.test-remote-per-run-lock-and-image-prune.md` implemented 2026-11-12

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

- **Lock.** `mkdir "$HOME/$RUN_DIR.lock"` over ssh is atomic: it fails if the directory exists. The lock holds an `owner` file with the local host name, the pid, the start time (`date +%s` read **on the server**) and the run's `--timeout-min`, so a stale lock can be read, not guessed. It is released by one local `cleanup` function, installed once and called from the EXIT, INT and TERM traps; it does the lock release, the `$EXCLUDES` removal and the container kill that the two existing traps do today (a second `trap` for the same signal would replace the first). The trap is armed **only after the take succeeded**, and the release checks the owner token the run wrote, so a run refused because the lock is held can never release the holder's lock. The lock is taken **before the sync**, so it covers the whole window. The container-name check stays as a second layer (it also catches a container left behind).
- **The take returns its own verdict, in one ssh call.** The take replaces the existing run-directory `mkdir -p` call and creates the directory itself (net zero extra round trips); the container-name check stays a separate, earlier call. The remote command exits 0 when it took the lock, 10 when it is held (the owner file on stdout), 11 when it took the directory but could not write the owner file (it removes the directory first). An ssh status of 255, or any other code, is "could not take the lock", a different message from "held". Do not look for the directory in a second call.
- **A stale lock.** A crashed run, a killed laptop or a lost network leaves the lock behind, which would block that branch forever. The rule: a lock is stale when no container of the run's name exists **and** the server's `date +%s` is later than the owner's start time plus the **owner's** recorded timeout plus a margin (default 10 minutes, `TEST_REMOTE_LOCK_MARGIN_MIN` overrides it so the live acceptance need not wait 40 minutes). An owner file that is missing or unreadable (a take interrupted between `mkdir` and the write) is "held, owner unknown", never stale. **A run never clears a stale lock itself**: it refuses, says the lock is stale and names `--unlock`. `--unlock` removes a lock **only when it is stale**; on a live lock it exits non-zero and says when the lock becomes stale. Either way it prints the owner file's contents. This is the part that needs care: a lock that cannot be cleared is worse than no lock.
- **Prune.** `--prune-images` lists `agent-skills-test` images, keeps the tag the current Dockerfile names and any tag a running container uses, skips the `<none>` tag, and removes the rest with `docker rmi <repo:tag>` by explicit tag, never with `-f`. It never calls `docker image prune` or `docker system prune`. It refuses (exit 1, nothing removed) while any `~/agent-skills-test-*.lock` exists, because a run that has built its image but not yet started its container is in neither keep set; and it refuses when `docker ps` or `docker images` fails.
- **Where the options sit in `run.sh`.** `--unlock` and `--prune-images` run after `server_ready` and, for `--unlock`, after `RUN_DIR` is computed; `--prune-images` needs the current tag, so the Dockerfile hash is computed above the sync. Each is mutually exclusive with `--run`, `--reap` and the other, and each exits without syncing. The usage text and the `--help` header name both. The `--help` output is a hard-coded line range today (`sed -n '2,19p'`), so the range must follow the header, and a test holds that `--help` names both options. `--reap` skips `*.lock` directories.

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

- [x] Take `mkdir "$HOME/$RUN_DIR.lock"` over ssh before the sync, replacing the run-directory `mkdir` call, with the exit-status verdict (0 taken, 10 held, 11 owner write failed); on held, exit non-zero naming owner and age.
- [x] Write the owner file (host, pid, server-side start time, `--timeout-min`) into the lock directory.
- [x] One `cleanup` function for the EXIT, INT and TERM traps (lock release, `$EXCLUDES`, container kill), armed only after the take succeeded; a failed release prints a warning naming the lock and `--unlock` and does **not** change the run's exit status (a green run is not turned red by a leaked lock; staleness covers it).
- [x] Staleness rule (server clock, owner's timeout, margin) and `--unlock` (stale locks only; a run never clears one itself).
- [x] Keep the container-name check as the second layer. The server-side lock logic is one file, `scripts/remote-test/lockctl.sh` (sent over ssh stdin, so it is testable apart from `run.sh`), rather than functions in `server-lib.sh`.
- [x] `--reap` skips `*.lock` directories; `--help` range follows the header.

**Dependencies:** none.

### Phase 2: The image prune — Risk: Low

**Files:** `scripts/remote-test/run.sh`

- [x] `--prune-images`: list tags of the `agent-skills-test` repository only.
- [x] Keep the current tag and any tag a running container uses; skip `<none>`; remove the rest with `docker rmi <repo:tag>`, never `-f`.
- [x] Refuse and exit non-zero when `docker ps` or `docker images` fails, as `--reap` does, and while any `~/agent-skills-test-*.lock` exists.
- [x] Hoist the Dockerfile-hash computation above the sync so the option can use it.

**Dependencies:** none (independent of Phase 1).

### Phase 3: Tests and acceptance — Risk: Low

**Files:** `tests/test-remote-runner.test.js`

- [x] Offline tests for each new behaviour, each mutation-proved.
- [ ] A live two-run overlap on the server, and a live prune, both recorded in the QA report.

**Dependencies:** Phases 1 and 2.

### Phase 4: Docs — Risk: Low

**Files:** `docs/contributing/testing-remote.md`, `CHANGELOG.md`

- [x] Replace the "best-effort guard" wording with what the lock holds and what it does not.
- [x] Document `--unlock` and `--prune-images`.

**Dependencies:** Phases 1 and 2.

## 7. Files Summary

**Core implementation:**

1. ✅ `scripts/remote-test/run.sh` — lock, `--unlock`, `--prune-images`
2. ✅ `scripts/remote-test/lockctl.sh` (new) — the server-side take, release, unlock and prune, sent over ssh stdin; `server-lib.sh` is unchanged

**Tests:**

3. ✅ `tests/test-remote-runner.test.js` — new cases (the timeout comes from `spawnBudget`, never a literal; the repo guard `tests/test-harness-concurrency.test.js` rejects one)

**Documentation:**

4. ✅ `docs/contributing/testing-remote.md`
5. ✅ `CHANGELOG.md`

## 8. Testing Strategy

**Unit (offline, stubbed `ssh` and `rsync`):**

- The stub `ssh` gets the new arms **first**, matched on text no existing arm shares (`*".lock"*`): its existing arms match `docker ps -a` and `touch … docker image inspect`, and a lock command containing either would be eaten by the wrong arm. Lock tests assert the call log, not only the exit code.
- A held lock stops the run before any `rsync`, names the owner and exits non-zero. A refused run issues **no release** (it must not release the holder's lock).
- A free lock is taken, written with an owner and released on a normal exit, on a failing run and on SIGINT; the `$EXCLUDES` file is still removed and the container still killed on the INT path (the traps were merged).
- An ssh failure on the take (255) is a different message and exit from "held"; an owner-write failure (11) leaves no directory.
- A stale lock is refused by a run, naming `--unlock`, and removed by `--unlock`; a live lock (no container yet, inside the limit) is refused by `--unlock` and not removed; a lock with a missing owner file is never stale. Staleness reads the server's clock.
- A failed release warns, names the lock and `--unlock`, and leaves the run's exit status unchanged.
- `--reap` skips a `*.lock` directory. `--help` names `--unlock` and `--prune-images`. `--unlock`, `--prune-images`, `--reap` and `--run` are mutually exclusive.
- `--prune-images` refuses while a lock exists and when `docker ps` or `docker images` fails, removing nothing, and skips `<none>`.
- `--prune-images` issues `docker rmi` only for `agent-skills-test` tags other than the current one and those in use, and never `prune`.
- Every test that spawns takes its timeout from `spawnBudget` and removes its temp directory (`scripts/test-tmpdir.mjs` rejects a leaking prefix).

**Mutation:** for each, remove the behaviour (the `mkdir`, the release, the keep-current rule) and confirm a test goes red. A second-layer test must defeat the first layer on its own: one test must hold the lock with **no** container present.

**Live (on the server, recorded in the QA report):** two runs started together on one branch, where the second must refuse; a stale lock cleared with `--unlock`; a prune that removes an old tag and keeps the current one. `uptime` on both hosts before and after each. Run the full `npm run test:remote` on the final tree after **every** fix, not only the guard file (the lesson of task.295).

## 9. Success Criteria

**Functional**

- [ ] Two overlapping runs on one branch: the second exits non-zero before its sync, names the first run, and the first run is not disturbed. The overlap run is recorded in the QA report.
- [ ] A crashed run's lock is cleared by `--unlock`, and a live run's lock is not removed by it. Recorded in the QA report.
- [ ] `--prune-images` removes an old `agent-skills-test` tag and keeps the current tag and any in use; it never calls a global prune. Recorded in the QA report.
- [ ] No existing option's behaviour changes. Held by the existing cases in `tests/test-remote-runner.test.js` (arguments, exit status, timeout, linked worktree, reap), which run unchanged.

**Performance**

- [ ] The lock adds at most one ssh round trip to a run: the take replaces the existing run-directory `mkdir` call, the release is the one extra call. The calls are counted from the stub's call log in a test, not timed.
- [ ] Load on both hosts is recorded before and after the live runs in the QA report (`uptime`).

**Code quality**

- [ ] `npm run lint:shell` passes on the changed shell files, and `format:check` on the changed test file (`.prettierignore` excludes Markdown, and prettier does not read shell).
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

**Partial:** the lock and the prune are independent phases; either can be reverted alone. (The prune's refusal while a lock exists reads the lock phase's directories; reverting the lock leaves that check harmless, since no lock then exists.)

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
| 2026-11-12 | 1.1     | Review passed (9/10) — 12 Important findings fixed: merged traps, take-then-arm release, one-call take verdict, stale-only `--unlock`, server clock and owner timeout, `--help` range, reap vs `.lock`, prune refuses while locked, option placement, stub arm order, criteria wording | review-task |
| 2026-11-12 |         | Status → ready-for-development | review-task |
| 2026-11-12 |         | Implemented: lockctl.sh, lock/unlock/prune in run.sh, 22 offline tests (mutation-proved), docs and CHANGELOG; `ci:fast` green on the server (8428 pass); status → ready-for-review | develop |

<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: The lock
- [x] Phase 2: The image prune
- [ ] Phase 3: Tests and acceptance (offline tests done and mutation-proved; the live runs on the server are recorded in the QA report)
- [x] Phase 4: Docs

## References

- task.295 (`docs/tasks/task.295.test-remote-lan-server-route/`), Future Improvements and QA gates 3 to 5
- `docs/contributing/testing-remote.md`, step 4

## Notes

QA artifacts land beside this file: `task.296.qa.N.*.md`, `task.296.gate.N.*.yml`, bug reports `task.296.bug.N.*.md`.

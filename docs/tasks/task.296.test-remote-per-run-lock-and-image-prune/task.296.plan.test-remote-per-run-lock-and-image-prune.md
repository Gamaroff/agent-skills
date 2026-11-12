---
id: task.296.plan
title: "Implementation Plan: test:remote per-run lock and image-tag prune"
type: plan
task-ref: task.296.test-remote-per-run-lock-and-image-prune.md
---

# Implementation Plan: test:remote per-run lock and image-tag prune

> Requirements and success criteria: [task.296.test-remote-per-run-lock-and-image-prune.md](task.296.test-remote-per-run-lock-and-image-prune.md)

## Overview

Take an atomic `mkdir` lock on the server before the sync, keep the container-name check as a second layer, and add a prune option that removes old `agent-skills-test` tags by explicit name.

## Phase-by-Phase Implementation Guide

### Phase 1: The lock

**Files:** `scripts/remote-test/run.sh` (after the container-name check near line 146, before the sync), `scripts/remote-test/server-lib.sh`.

> **Superseded where it differs:** the task document's Target section (review 1, 2026-11-12) is the authority for the lock take, the traps, staleness and `--unlock`. The bullets below follow it.

- Take the lock in the existing container-check ssh call. The remote command exits 0 (taken), 10 (held; owner file on stdout) or 11 (owner write failed, directory removed); `mkdir "$HOME/${RUN_DIR}.lock"` then write `owner` with host, pid, server-side `date +%s` and `--timeout-min`. An ssh status of 255 or any other code is a different message from "held" (do not read a failed ssh as "held" or as "free").
- One local `cleanup` function for the EXIT, INT and TERM traps (lock release, `$EXCLUDES`, container kill), armed only after the take succeeded; the release checks the owner token. A failed release warns, names the lock and `--unlock`, and leaves the exit status alone.
- Stale rule: no container of the run's name exists **and** the server's `date +%s` is past the owner's start time plus the owner's recorded timeout plus a margin (10 minutes; `TEST_REMOTE_LOCK_MARGIN_MIN` overrides). Read the owner file; do not infer from directory mtime. A missing owner file is never stale.
- `--unlock`: removes a lock only when it is stale, and prints the owner file's contents so the user sees whose run it was. On a live lock it exits non-zero and says when the lock becomes stale. A run never clears a stale lock itself.

### Phase 2: The image prune

**Files:** `scripts/remote-test/run.sh` (beside `--reap`, near line 105).

- Run on the server through `ssh … bash -s` with a **quoted** heredoc, as `--reap` does.
- `docker images --format '{{.Repository}}:{{.Tag}}' agent-skills-test` gives the candidates. The keep set is the current tag (computed locally from the Dockerfile hash, as at line 192) plus the image of every running container (`docker ps --format '{{.Image}}'`). Remove each other tag with `docker rmi "$tag"`.
- Fail closed: if either docker call fails, or any `~/agent-skills-test-*.lock` exists, print why and exit 1 without removing anything. Skip the `<none>` tag; never `docker rmi -f`.

### Phase 3: Tests

**Files:** `tests/test-remote-runner.test.js`.

- Extend the stub `ssh` to match the lock command (`*".lock"*`) **before** the existing `docker ps -a` and `touch … docker image inspect` arms, with `STUB_LOCK_HELD`, `STUB_LOCK_FAIL`, and a recorded call log.
- One test must hold the lock with no container present, so the second layer's absence cannot hide a broken first layer, and one the other way round.

### Phase 4: Docs

Update step 4 of `docs/contributing/testing-remote.md`: the lock, the staleness rule, `--unlock`, `--prune-images`.

## Key Patterns and References

- The stub-`ssh` style and the `spawnBudget` import in `tests/test-remote-runner.test.js`.
- Quoted heredoc for a remote script (`--reap`); never an unquoted one (a backtick in an unquoted heredoc executes).
- Names reach the remote shell only after the validators in `run.sh` have accepted them; the lock path is built from `RUN_DIR`, which is already a validated slug-and-hash.

## Testing Approach

Offline first, then a live overlap, a live stale-lock clear and a live prune on the server. After every fix run the whole of `npm run test:remote`, not only the guard file.

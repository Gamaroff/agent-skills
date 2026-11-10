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

- Take the lock with one ssh call: `mkdir "$HOME/${RUN_DIR}.lock" 2>/dev/null && printf '%s\n' "<host> <pid> <epoch>" > "$HOME/${RUN_DIR}.lock/owner"`. A non-zero status with the directory present means held; a non-zero status without it means ssh failed, which is a different message and a different exit (do not read a failed ssh as "held" or as "free").
- Release in a local `trap … EXIT` that runs `rmdir`-style removal of the lock over ssh. Report a failed release; never swallow it.
- Stale rule: the owner file's epoch plus the run's limit (`--timeout-min`) plus a margin (suggest 10 minutes) is in the past **and** no container of the run's name exists. Read the owner file; do not infer from directory mtime.
- `--unlock`: remove the lock and print the owner file's contents so the user sees whose run it was. It refuses while a container of the run's name is running.

### Phase 2: The image prune

**Files:** `scripts/remote-test/run.sh` (beside `--reap`, near line 105).

- Run on the server through `ssh … bash -s` with a **quoted** heredoc, as `--reap` does.
- `docker images --format '{{.Repository}}:{{.Tag}}' agent-skills-test` gives the candidates. The keep set is the current tag (computed locally from the Dockerfile hash, as at line 192) plus the image of every running container (`docker ps --format '{{.Image}}'`). Remove each other tag with `docker rmi "$tag"`.
- Fail closed: if either docker call fails, print why and exit 1 without removing anything.

### Phase 3: Tests

**Files:** `tests/test-remote-runner.test.js`.

- Extend the stub `ssh` to match the lock command (`*"mkdir "*".lock"*`), with `STUB_LOCK_HELD`, `STUB_LOCK_FAIL`, and a recorded call log.
- One test must hold the lock with no container present, so the second layer's absence cannot hide a broken first layer, and one the other way round.

### Phase 4: Docs

Update step 4 of `docs/contributing/testing-remote.md`: the lock, the staleness rule, `--unlock`, `--prune-images`.

## Key Patterns and References

- The stub-`ssh` style and the `spawnBudget` import in `tests/test-remote-runner.test.js`.
- Quoted heredoc for a remote script (`--reap`); never an unquoted one (a backtick in an unquoted heredoc executes).
- Names reach the remote shell only after the validators in `run.sh` have accepted them; the lock path is built from `RUN_DIR`, which is already a validated slug-and-hash.

## Testing Approach

Offline first, then a live overlap, a live stale-lock clear and a live prune on the server. After every fix run the whole of `npm run test:remote`, not only the guard file.

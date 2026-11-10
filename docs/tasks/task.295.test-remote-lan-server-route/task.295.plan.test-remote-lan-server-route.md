---
id: task.295.plan
title: "Implementation Plan: Run the test suite on the LAN server (test:remote)"
type: plan
task-ref: task.295.test-remote-lan-server-route.md
---

# Implementation Plan: Run the test suite on the LAN server (test:remote)

> Requirements and success criteria: [task.295.test-remote-lan-server-route.md](task.295.test-remote-lan-server-route.md)

## Overview

A bash runner copies the shape of tinker-city's `scripts/remote-test/run.sh`: probe, rsync to a per-branch directory, run inside a low-weight container under `timeout --foreground -k`, and exit with the run's own status. Read the reference files before writing; copy patterns, never import them.

## Phase-by-Phase Implementation Guide

### Phase 0: Re-measure and decide

**Commands** (read-only):

- Toolchain: `ssh -o ConnectTimeout=6 -o BatchMode=yes ci@192.168.1.249 'for t in node npm python3 jq git rsync shellcheck docker zsh gawk mawk; do printf "%s: " "$t"; command -v "$t" || echo MISSING; done'`.
- Load: `uptime` on both hosts; `ssh … 'docker ps --format "{{.Names}} {{.Status}}"'`.
- Lockfile: `node -e` over `package-lock.json` for `lockfileVersion`, then check it against the server's npm 9.2.0. Lockfile v3 needs npm 7 or later, so 9.2.0 should read it; confirm, do not assume.
- `eval:all`: read `package.json`'s `eval:all` script (line 51) and the drivers it reaches. The default driver is replay. `evals/shared/drivers/claude-sdk.mjs` and `evals/shared/lib/gh-sandbox.mjs` read the environment, so check whether any default scenario reaches them.

**Output**: a short "Decisions" note under Notes in the task document.

### Phase 1: Runner skeleton

**Files**: `scripts/remote-test/server-lib.sh`, `scripts/remote-test/run.sh`.

`server-lib.sh` (sourced; no `set -e`, no top-level `exit`): `server_ready HOST TOOL...` builds `command -v T >/dev/null && …` for each tool, ending in `docker version >/dev/null 2>&1`, and runs it with `ssh -o ConnectTimeout=6 -o BatchMode=yes`. Note tinker-city's probe ends in `docker compose version`. This repository needs plain `docker`, so do not copy that tail.

`run.sh` skeleton:

- `set -euo pipefail`; resolve the repo root from `BASH_SOURCE`.
- Defaults: `HOST="${TEST_REMOTE_HOST:-ci@192.168.1.249}"`, `TIMEOUT_MIN="${TEST_REMOTE_TIMEOUT_MIN:-30}"`, scripts list empty meaning `ci:fast`.
- `--run` case arm: `[[ "${2:-}" =~ ^[A-Za-z0-9:._-]+$ ]] || { echo "✗ --run needs an npm script name, got '${2:-}'" >&2; exit 2; }`. A name starting with `-` must also be refused: add `[[ "$2" != -* ]]`.
- `TEST_LOCAL=1`: run each script with `npm run "$s"`, stop at the first failure and exit with its code. Print which side ran.
- Unreachable: `echo "✗ …unreachable… Set TEST_LOCAL=1 to run on this machine." >&2; exit 1`.

### Phase 2: Sync, container and install

**Sync list**: use git as the source of truth for what ships.

```bash
git ls-files -z --cached --others --exclude-standard | rsync -a --delete --from0 --files-from=- ./ "$HOST:$RUN_DIR/"
```

`--files-from` with `--delete` deletes only inside the listed set's directories, so confirm stale files are removed. If not, use `--delete-excluded` with an explicit exclude list built from `git ls-files --others --ignored --exclude-standard --directory`. Test the choice by deleting a tracked file locally and checking it is gone remotely. Sync `.git` separately (it is not in `git ls-files`): `rsync -a --delete .git/ "$HOST:$RUN_DIR/.git/"`, and guard for the worktree case where `.git` is a file (`[ -d .git ]`).

**Per-branch dir**: `SLUG=$(git rev-parse --abbrev-ref HEAD | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-50)`, `RUN_DIR="agent-skills-test-${SLUG:-detached}"`.

**Container** (each as an array element so no value is spliced):

```
docker run --rm --user "$(id -u):$(id -g)" --cpu-shares 128 \
  -v "$HOME/$RUN_DIR:/work" -w /work -e HOME=/work/.home -e CI=true IMAGE \
  bash -lc 'npm ci --no-audit --no-fund && npm run "$@"'
```

Resolve `$(id -u)` on the server, not the laptop: it runs inside the remote command string. Validated script names are the only values spliced into that string.

**Image**: `node:22-bookworm` plus `apt-get install -y --no-install-recommends python3-yaml gawk mawk zsh jq git` (and `shellcheck` only if Phase 0 finds a script that needs it). Build it on the server on first use, tagged by a hash of the Dockerfile, so an unchanged file reuses the layer cache.

**Install cache**: store `sha256sum package-lock.json` in `$RUN_DIR/.lock-hash`; run `npm ci` only when it differs or `node_modules` is absent. Write the hash only after `npm ci` succeeds.

### Phase 3: Timeout and teardown

```bash
timeout --foreground -k 1m "${TIMEOUT_MIN}m" ssh "$HOST" "$REMOTE_CMD"
STATUS=$?
```

Capture `STATUS` on the very next line. No `|| true`, no `tail`, and `;` not `&&` inside any `case` arm. End with `exit "$STATUS"`. Before the run print `uptime` and `docker ps` from the server. Teardown is `--rm`; `--reap` removes per-branch directories untouched for N days.

### Phase 4: Tests

Put stub `ssh` and `rsync` scripts first on `PATH` in a temp directory that a `t.after` removes (`scripts/test-tmpdir.mjs` rejects a new leaking prefix). Cases: `--run 'x;y'` exits 2 and the `ssh` stub is never called (assert on a call log, not on the output text); the unreachable stub exits non-zero and the message names `TEST_LOCAL=1`; `TEST_LOCAL=1` never calls `ssh`; the exit code equals the stub's, for 0, 1 and 124.

Check the new test's glob already appears in `package.json:27`'s `test:suite` (`'tests/*.test.js'` does). A test placed elsewhere runs nowhere.

### Phase 5: Docs

`docs/contributing/testing-remote.md`: usage, the host rules (shared, WSL2, C: drive, loopback hang), `TEST_LOCAL=1`, `TEST_REMOTE_HOST`, troubleshooting. One line in `AGENTS.md`, subject to the owner's Phase 0 answer.

## Key Patterns and References

- `~/Development/tinker-city/scripts/remote-test/run.sh`: argument parsing, per-branch directory, the `timeout -k` comment block.
- `~/Development/tinker-city/scripts/remote-test/server-lib.sh`: the probe.
- `~/Development/tinker-city/scripts/remote-test/compose-lib.sh`: the rsync exclude list and its comments.
- `scripts/test-tmpdir.mjs`: the leak ratchet that any new test must respect.

## Testing Approach

Offline stubbed tests prove the branching and the exit code. The five real runs on .249 prove the toolchain and the sync. Mutation-prove each guard: revert the behaviour, confirm a named test goes red.

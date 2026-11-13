# Sprint Review Summary - Run the test suite on the LAN server (test:remote)

**Story/Task ID:** task.295
**Completed Date:** 2026-11-10
**Pull Request:** [#872](https://github.com/Gamaroff/agent-skills/pull/872)

---

## Summary

`npm run test:remote` syncs the working tree to the LAN server, runs the root test scripts there in a container that mirrors CI, and exits with their status, so the laptop only runs `ssh` and `rsync`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A clean-tree run executes `ci:fast` on the server and exits 0 (8365 tests, 0 fail), with no test process on the laptop
- [x] A deliberately broken assertion makes the route exit 1 with the failure in its output
- [x] A bad `--run` name exits 2 before any `ssh`; an unreachable server fails loudly and never runs locally
- [x] The zsh and awk variants run on the server; the container runs at a low CPU weight (`--cpu-shares 128`)
- [x] Load on both hosts is recorded before and after; lint, shellcheck and the offline guard pass

### Key Features Implemented

- **The runner** (`scripts/remote-test/run.sh`): per-branch directory on the server, rsync with `--delete`, a named container with an in-container time limit, a local backstop that kills it, `--reap`, and `TEST_LOCAL=1` as the only local escape
- **A CI-parity image** (`scripts/remote-test/Dockerfile`): Debian trixie base with zsh, awk variants, jq, git, rsync and shellcheck
- **A guard test** (`tests/test-remote-runner.test.js`, 19 tests, offline): `ssh` and `rsync` are stubs, so no network is touched

---

## Technical Details

### Files Modified/Created

- `scripts/remote-test/{run,container,server-lib}.sh`, `scripts/remote-test/Dockerfile` - the route
- `tests/test-remote-runner.test.js` - the offline guard
- `docs/contributing/testing-remote.md`, `docs/contributing/README.md`, `AGENTS.md` - documentation
- `package.json` - one added script; `CHANGELOG.md` - one entry

### Architecture/Design Decisions

The container name doubles as a best-effort per-branch guard; it has a stated window of minutes (a real per-run lock is listed under Future Improvements). Owner decisions: a container rather than a host install; `ci:fast` is the default target; agents use the route when the server is up.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit Tests:** 19 in `tests/test-remote-runner.test.js`, mutation-proved
- **Acceptance runs:** three real runs on the server, recorded in the QA report
- **QA:** five gates (final CONCERNS 85/100, no high item open) and a PR conformance review with no open coverage finding
- **Defect found at acceptance:** a hardcoded spawn timeout in the guard test, fixed in `13486822`

---

## Security & Compliance

- **Security:** the `--run` and `--host` validators were probed (34 candidates, 0 reproduced); two spec challenges are listed in the DoD for the owner
- **Compliance:** not applicable (developer tooling)

---

## Known Limitations and Future Work

- The branch guard has a window of minutes between its check and the container starting; a per-run lock is listed as a future improvement
- A SIGTERM sent only to the runner is handled after the foreground `ssh` returns, and `--timeout-min` is capped at 9999 minutes
- Old `agent-skills-test:*` image tags accumulate on the server

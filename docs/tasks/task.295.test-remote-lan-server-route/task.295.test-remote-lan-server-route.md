---
id: task.295
title: "Run the test suite on the LAN server (test:remote)"
type: task
description: "Add `npm run test:remote`: sync the working tree to the shared LAN server (.249), run the root test scripts there in a container that mirrors test.yml, and exit with their status, so the overheating laptop only syncs files and prints output."
tags: [infrastructure, testing, developer-tooling, remote-test]
category: infrastructure
status: planned
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 16
github_issue: 871
---

# Technical Task: Run the test suite on the LAN server (test:remote)

**Status:** Planned

**GitHub Issue**: [#871](https://github.com/Gamaroff/agent-skills/issues/871)

Source: a handoff written 2026-11-10 from a tinker-city session. Its figures were measured that day. This document restates only what a developer needs, and Phase 0 re-measures every figure before anything is built on it.

---

## 1. Overview

**Task**: add an `npm run test:remote` route. It syncs the working tree to the LAN server `ci@192.168.1.249`, runs root npm scripts there inside a container, and exits with their status. The laptop stops running the suite.

**Scope**: one runner script and its small library, a container image definition, a `package.json` script, a guard test for the runner's argument and exit-code behaviour, contributor documentation, and one line in `AGENTS.md`.

**Key deliverables**:

1. `npm run test:remote` runs `ci:fast` on .249 and exits with its status.
2. `npm run test:remote -- --run <script>` (repeatable) runs any root script remotely.
3. `TEST_LOCAL=1` runs the same scripts on the laptop. An unreachable server fails loudly and names it.
4. Docs, and an `AGENTS.md` line telling agents to use the route when .249 is up.

**Expected outcome**: a contributor or agent runs the suite without loading the laptop, and the result is as trustworthy as a local run: a red run is red, and the zsh and awk variants really run.

---

## 2. Motivation

### Current Problems

1. **The laptop throttles under test load.** On 2026-11-10 at 14:26 an `npm run ci:fast` was the main load on the laptop (a 2019 MacBook Pro running Omarchy): 4 to 14 runnable processes in `vmstat 1 5`, load average 5.25, and cores at 93 to 97 °C against a 100 °C critical limit, all flagged `ALARM (CRIT)` by `sensors`. Earlier that day a 9.6 load average ran the fans at maximum, mostly from `scripts/qa-snippets-docscan.mjs`. (Source: handoff; Phase 0 re-measures.)
2. **The owner's standing rule is unmet.** Heavy and browser-driven work goes to .249 whenever it is up. This repository has no route that does it, so every session runs the suite locally.
3. **No remote route exists to copy from here.** tinker-city has one (`scripts/remote-test/`), which has been through many defects. Nothing in this repository reuses that experience.
4. **The server lacks what CI installs.** Per the handoff, .249 has no zsh and no shellcheck, and its npm is 9.2.0. Run on the host as it stands, the zsh variants of the documented-block suites would skip, and CI parity would be false.

### Benefits of the Solution

1. **The laptop stays cool**: only `ssh` and `rsync` run locally.
2. **CI parity**: a container that mirrors `.github/workflows/test.yml` runs the same tools, including zsh and the awk variants.
3. **One exit-code contract**: the route's status is the remote run's status, proved by a deliberately red run.
4. **A safe shared-host citizen**: low CPU weight, per-branch directories, and a clean teardown.

---

## 3. Technical Background

### Current Architecture

Measured in this repository on 2026-11-10 (`git grep -n` / `sed -n`):

- `package.json:24` `ci` = `ci:fast` + `eval:all` + `validate:all` + `check:generated` + `bundle:check` + `lint:shell` + `lint:secrets`.
- `package.json:25` `ci:fast` = `format:check` + `npm test`.
- `package.json:26` `test` = `node scripts/test-tmpdir.mjs -- npm run test:suite`. The wrapper gives each run its own `TMPDIR` and carries a leak ratchet. It must run on the server too.
- `package.json:27` `test:suite` is a `&&` chain: 17 `bash …test.sh` steps and one `node --test --test-concurrency="${TEST_CONCURRENCY:-4}" …`.
- `.github/workflows/test.yml` runs on GitHub-hosted `ubuntu-latest` with `fetch-depth: 0` (because `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` replays two historical commits), Node 22, `pip install pyyaml`, `apt-get install gawk mawk zsh`, `npm ci`, `format:check`, `npm test`, `eval:all`. A missing tool skips with a printed notice and does not fail.
- `.gitignore` ignores `.agents/skills` (a symlink), `node_modules/`, `*.log`, `.claude/*` and `/.worktrees/`.

**Server** (from the handoff, measured 2026-11-10, re-measured in Phase 0): node v22.22.1, npm 9.2.0, python3 3.14.4 with PyYAML 6.0.3, jq 1.8.1, git 2.53.0, rsync 3.4.1, gawk and mawk present, **zsh missing**, **shellcheck missing**, docker 29.8.1 (8 CPUs, about 23 GiB to Docker). It is WSL2 and also a gaming PC. It runs tinker-city's self-hosted CI runner, its remote test runs (`~ci/tinker-city-test*`) and its LAN app, with **no common lock** between repositories.

**Reference implementation** (read, never edited): `~/Development/tinker-city/scripts/remote-test/` holds `run.sh` (argument parsing, per-branch directory, rsync, ssh, timeout, exit code, teardown), `server-lib.sh` (`server_ready HOST TOOL...`), `compose-lib.sh` (rsync excludes and `tc_gitignored_paths`), `container.sh` (in-container install and `phase` markers) and `docs/development/testing-runbook.md`. Its `--run` argument is validated against `^[A-Za-z0-9:._-]+$` because the name is spliced into a remote shell command (`run.sh`, the `--run)` case arm).

### Target Architecture

```
laptop                                   .249 (shared)
  npm run test:remote
    ├─ server_ready probe  ──ssh──────►  rsync, docker present?
    ├─ rsync -a --delete ──────────────► ~ci/agent-skills-test-<branch-slug>/
    └─ ssh timeout --foreground -k 1m ─► docker run --rm --user UID:GID
         STATUS=$? ; exit "$STATUS"           --cpu-shares 128  image: node:22-bookworm
                                              + python3-yaml gawk mawk zsh jq git [shellcheck]
                                              npm ci (skipped when lockfile hash unchanged)
                                              npm run <script> …
```

### Important Clarifications

- **Container versus host install is the owner's decision.** This document specifies the container (recommended: CI parity, clean host). Installing zsh and shellcheck on the host is the alternative; Phase 0 records the owner's choice and the plan changes only in Phase 2.
- **Default target is `ci:fast`**, not the full `ci`. The prompt that started this work was `ci:fast`. `eval:all` runs replay evals, and Phase 0 checks whether any need network or API credentials before they are allowed remotely. `eval:all` stays reachable through `--run eval:all`.
- **The remote run is a clean-checkout run by construction.** Gitignored paths are not synced, so the gitignored `.agents/skills` symlink is absent there. That is the case the `test:clean-checkout` script exists for, and it is a benefit, not a defect. Local-pass and remote-fail on a symlink-dependent test is a real finding, not a route bug.
- **The first sync is large.** `.git` is 123 MB and `node_modules` is 272 MB (`du -sh`, handoff). `node_modules/` is excluded from the sync and installed on the server.

---

## 4. Scope

### In Scope

✅ `npm run test:remote`, its runner, its argument grammar and exit-code contract.
✅ A container image definition that mirrors `test.yml`'s toolchain.
✅ Per-branch remote directories, dependency-install caching keyed on the lockfile hash, low CPU weight, teardown.
✅ `TEST_LOCAL=1` as the explicit local escape; a loud failure when the server is unreachable.
✅ A guard test for argument validation and exit-code propagation.
✅ A contributor doc and an `AGENTS.md` line.

### Out of Scope

❌ Changing `.github/workflows/test.yml`. CI stays on GitHub-hosted runners (decision of 2026-09-28).
❌ Editing tinker-city. Its runner is read and patterns are copied.
❌ A cross-repository lock on .249. No common lock exists, and this task does not invent one; it lowers its own weight and checks load first.
❌ Running browser-driven work. This suite has none.
❌ Auto-fallback to local for the plain form. An optional `--auto` mode is Phase 5 only if cheap.

---

## 5. Breaking Changes

None. The change adds one script and files beside it. No existing script, test or workflow changes behaviour.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.295.plan.test-remote-lan-server-route.md](task.295.plan.test-remote-lan-server-route.md)

### Phase 0: Re-measure and decide

**Risk**: Low. **Dependencies**: none.

- [ ] Re-measure the server's tools and load (`ssh ci@192.168.1.249` toolchain probe, `uptime`, `docker ps`) and the laptop's `uptime`.
- [ ] Confirm npm 9.2.0 against this `package-lock.json` (`lockfileVersion`) before deciding whether the host or the container installs dependencies.
- [ ] Read the `eval:all` scenarios and drivers for network or credential needs (the default driver is replay; `evals/shared/drivers/claude-sdk.mjs` and `evals/shared/lib/gh-sandbox.mjs` read the environment). Record the verdict for the default-target decision.
- [ ] Record the owner's three answers (container or host, `ci:fast` or `ci`, whether agents are required to use the route) in this document's Notes. Ask when unrecorded; never assume.

### Phase 1: Runner skeleton, argument grammar and exit codes

**Risk**: Medium. **Dependencies**: Phase 0.

- [ ] Add the runner and a sourced library with `server_ready HOST TOOL...` (one SSH round trip, `BatchMode=yes`, `ConnectTimeout=6`).
- [ ] Parse `--run <script>` (repeatable, validated `^[A-Za-z0-9:._-]+$`, exit 2 before any ssh), `--host`, `TEST_REMOTE_HOST`, `TEST_LOCAL=1`.
- [ ] Unreachable server: exit non-zero with a message that names `TEST_LOCAL=1`. Never fall back silently.
- [ ] Capture `STATUS=$?` straight after the ssh call and `exit "$STATUS"` at the end. Use `;` between steps in any `case` arm, and never pipe the run into `tail` or `grep`.

### Phase 2: Sync, container and dependency install

**Risk**: High. **Dependencies**: Phase 1.

- [ ] `rsync -a --delete` of the tree as git sees it: tracked plus untracked-not-ignored, excluding gitignored paths and `node_modules/`; keep `.env` and secrets out.
- [ ] Per-branch remote directory `~ci/agent-skills-test-<branch-slug>`. In a linked worktree `.git` is a file, so no exclude may assume a `.git/` directory.
- [ ] Sync `.git` so the history-backed replay test runs; otherwise state in the output that it skips.
- [ ] Container image mirroring `test.yml` (`node:22-bookworm` plus `python3-yaml gawk mawk zsh jq git`, and `shellcheck` if Phase 0 finds a script needing it); `--user "$(id -u):$(id -g)"`, `--rm`, `--cpu-shares 128`.
- [ ] `npm ci` in the container, skipped when a stored hash of `package-lock.json` is unchanged.

### Phase 3: Timeout, teardown and shared-host behaviour

**Risk**: Medium. **Dependencies**: Phase 2.

- [ ] Wrap the remote run in `timeout --foreground -k 1m <N>m`; the bound has a default and an override.
- [ ] Print `uptime` and running containers on the server before the run, so a contended host is visible.
- [ ] Stay under `~ci/`; never write to the C: drive; never prune globally.
- [ ] Reap stale per-branch directories on request.

### Phase 4: Tests and acceptance runs

**Risk**: Medium. **Dependencies**: Phase 3.

- [ ] A guard test (offline, no ssh) for argument validation, exit 2 on `'x;y'`, and the unreachable-server message.
- [ ] Run the five acceptance checks in § 9 on .249 and record the evidence in the QA report.
- [ ] Mutation-prove each guard: revert the behaviour and confirm a test goes red.

### Phase 5: Docs, `AGENTS.md` and optional `--auto`

**Risk**: Low. **Dependencies**: Phase 4.

- [ ] A contributor doc under `docs/contributing/` (usage, host rules, troubleshooting), linked from `docs/contributing/README.md`.
- [ ] One `AGENTS.md` line: test runs go to `test:remote` when .249 is up, `TEST_LOCAL=1` otherwise (conditional on the owner's answer in Phase 0).
- [ ] Optional, only if cheap: `--auto` probes the server and falls back to local, for scripted callers. The plain form still fails loudly.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. 🆕 `scripts/remote-test/run.sh`: the runner (name and location are the developer's call; keep them under `scripts/`).
2. 🆕 `scripts/remote-test/server-lib.sh`: the sourced reachability and toolchain probe.
3. 🆕 `scripts/remote-test/Dockerfile` (or an inline image definition): mirrors `test.yml`'s toolchain.
4. ✏️ `package.json`: one `test:remote` script. (The hand-maintained suite list is not touched: a new `tests/` file reaches `npm test` only if its glob already matches. Verify, per the trap in `docs/contributing/traps.md`.)

### Files to Modify (Tests)

5. 🆕 `tests/test-remote-runner.test.js` (or a `.test.sh` beside the runner): the offline guard tests.

### Files to Modify (Documentation)

6. 🆕 `docs/contributing/testing-remote.md`.
7. ✏️ `docs/contributing/README.md`: link to it.
8. ✏️ `AGENTS.md`: one line.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the runner's offline behaviour, run with a stubbed `ssh` and `rsync` on `PATH`. Argument grammar (`--run 'x;y'` exits 2 before any ssh; an empty name is refused), unreachable-server message names `TEST_LOCAL=1`, `TEST_LOCAL=1` never calls ssh, and the exit code equals the stub's.
- **Command**: `node --test tests/test-remote-runner.test.js`, with `CI=true` before any push.
- **Mutation list**: remove the `--run` validation, replace `exit "$STATUS"` with a trailing `echo`, and make the unreachable branch fall back to local. Each must turn a named test red.

### Integration Tests

- **Scope**: the five acceptance runs on the real server (§ 9). A stub proves the branching; only the real host proves the toolchain, the sync and the exit code.

### Performance Tests

- Record `uptime` on both hosts before and after one acceptance run, in the QA report. This is a recorded observation, not a timing bound.

### Consumer Tests

- A second branch, run at the same time, gets its own directory and does not disturb the first (checked on the server with two runs, under a low weight).

---

## 9. Success Criteria

### Functional

- [ ] `npm run test:remote` on a clean tree runs `ci:fast` on .249 and exits 0. While it runs, the laptop's `ps` shows no `node --test` or `test.sh` process, only `ssh` and `rsync`.
- [ ] **A red run is red.** With one assertion broken on a scratch commit, `npm run test:remote` exits non-zero with the failure in its output. The scratch commit is then reverted.
- [ ] `npm run test:remote -- --run 'x;y'` exits 2 before any `ssh`.
- [ ] With `TEST_REMOTE_HOST=nobody@192.0.2.1` it exits non-zero, names `TEST_LOCAL=1`, and does not run locally.
- [ ] The zsh and awk variants run on the server: the output carries no "skipping: zsh missing" or awk-variant skip notice.

### Performance

- [ ] `uptime` on the laptop and on .249 is recorded before and after the acceptance run, in the QA report (committed by acceptance; never only the implementation report).
- [ ] The route runs at a low CPU weight (`--cpu-shares 128`), verified by `docker inspect` on a live run.

### Code Quality

- [ ] Every file the task adds passes `npm run lint:shell` and `npm run format:check`; the offline guard passes under `CI=true`.
- [ ] `npm run ci:fast` is green on the final tree.
- [ ] `shellcheck` is clean on the new scripts, run through `lint:shell`.

### Migration

- [ ] The contributor doc exists and `AGENTS.md` carries the one line (subject to the owner's Phase 0 answer).
- [ ] No existing script's behaviour changed (`git diff` of `package.json` shows one added line).

---

## 10. Risk Assessment

### High Risk Areas

1. **A failed run reports green.**
   - Risk: a trailing `echo`, an `|| true`, a `&&` chain in a `case` arm or a pipe into `tail` replaces the run's status. tinker-city hit each of these.
   - Probability: Medium. Impact: Critical, because the route would certify red code.
   - Mitigation: capture `STATUS=$?` immediately; the red-run acceptance check and the mutation list both exercise it.
   - Rollback: revert the runner commit.
2. **Starving the shared host.**
   - Risk: two repositories' gates overlapping starved CI on 2026-11-04. There is no common lock.
   - Probability: Medium. Impact: High (CI and a gaming PC share it).
   - Mitigation: `--cpu-shares 128`, a load and `docker ps` print before the run, a wall-clock ceiling with `-k`, and no run during another's timed gate.
   - Rollback: stop the container; remove the per-branch directory.

### Medium Risk Areas

1. **Root-owned files in the synced directory.** Mitigation: run the container as the SSH user's UID and GID.
2. **A `.git` exclude that misses a worktree.** Mitigation: never assume `.git` is a directory; test from a linked worktree.
3. **Writing to the C: drive.** It filled to 100% once and WSL went read-only. Mitigation: every path under `~ci/`.
4. **Probing a closed loopback port hangs 133.5 s.** Mitigation: no loopback health checks.

### Low Risk Areas

1. **First sync is slow** (123 MB `.git`). Cheap after the first rsync.
2. **A history-backed test skips** if `.git` is not synced. The output must say so.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the route reports green on a red run, or it overloads .249.
- **Steps**: revert the commit that added the script and docs; `ssh ci@192.168.1.249 'docker ps'` and stop any container this route started; remove `~ci/agent-skills-test-*`.
- **Validation**: `npm run` lists no `test:remote`; `ssh ci@192.168.1.249 'ls -d ~ci/agent-skills-test-* 2>&1'` finds none.

### Partial Rollback (1-2 hours)

- **When to use**: the runner is sound but the container image or `AGENTS.md` line is wrong.
- **Steps**: revert Phase 5 (the `AGENTS.md` line), or switch Phase 2 to a host install if the owner chooses it.

### Forward Fix (< 4 hours)

- **When to use**: a non-critical gap such as a missing exclude or a wrong default timeout.
- **Approach**: fix forward, with a test that names the gap.

### Rollback Triggers

- **Critical**: green on red; the host under sustained load because of this route; a write outside `~ci/`.
- **Non-critical**: a slow first sync; a skipped history-backed test that the output already names.

---

## Stakeholder Sign-off

This task does not use sign-off (`sign-off.enabled` is not `true` in `skills-config.yaml`).

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Re-measure and decide
- [ ] Re-measure server and laptop
- [ ] Check eval:all for network or credential needs
- [ ] Record the owner's three answers

### Phase 1: Runner skeleton, argument grammar and exit codes
- [ ] Runner and probe
- [ ] Argument validation
- [ ] Loud failure naming TEST_LOCAL=1
- [ ] Exit-code capture

### Phase 2: Sync, container and dependency install
- [ ] rsync of the working tree
- [ ] Per-branch directory
- [ ] Container image and run flags
- [ ] Lockfile-keyed npm ci

### Phase 3: Timeout, teardown and shared-host behaviour
- [ ] Timeout with -k
- [ ] Load print before the run
- [ ] Reap stale directories

### Phase 4: Tests and acceptance runs
- [ ] Offline guard tests
- [ ] Five acceptance runs
- [ ] Mutation proof

### Phase 5: Docs, AGENTS.md and optional --auto
- [ ] Contributor doc
- [ ] AGENTS.md line
- [ ] Optional --auto

---

## References

- **Source handoff** (tinker-city session, 2026-11-10): `agent-skills-test-remote-handoff.md`
- **Reference runner**: `~/Development/tinker-city/scripts/remote-test/` (read-only)
- **CI definition**: `.github/workflows/test.yml`
- **Related traps**: `docs/contributing/traps.md` (hand-maintained suite list; gitignored symlink masks CI failures)

---

## Notes

### Important Reminders

- The server is shared and is also a gaming PC. Run at low weight and check load first.
- Never write to its C: drive. Stay under `~ci/`.
- Do not edit tinker-city.
- Commit, push or open a PR only when the owner says so.

### Known Issues

None yet.

### Open Questions for the Owner

1. Container (recommended) or a host install of zsh and shellcheck?
2. Default remote target `ci:fast` (recommended) or the full `ci`?
3. Must agents in this repository use `test:remote` when the server is up, as tinker-city requires?

### Future Improvements

- A cross-repository lock on .249, if overlapping gates recur.

---
id: task.295
title: "Run the test suite on the LAN server (test:remote)"
type: task
description: "Add `npm run test:remote`: sync the working tree to the shared LAN server (.249), run the root test scripts there in a container that mirrors test.yml, and exit with their status, so the overheating laptop only syncs files and prints output."
tags: [infrastructure, testing, developer-tooling, remote-test]
category: infrastructure
status: accepted
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 16
github_issue: 871
pr_number: 872
completed_date: 2026-11-10
---

# Technical Task: Run the test suite on the LAN server (test:remote)

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.295.review.1.test-remote-lan-server-route.md` implemented 2026-11-10

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

- [x] Re-measure the server's tools and load (`ssh ci@192.168.1.249` toolchain probe, `uptime`, `docker ps`) and the laptop's `uptime`.
- [x] Confirm npm 9.2.0 against this `package-lock.json` (`lockfileVersion`) before deciding whether the host or the container installs dependencies.
- [x] Read the `eval:all` scenarios and drivers for network or credential needs (the default driver is replay; `evals/shared/drivers/claude-sdk.mjs` and `evals/shared/lib/gh-sandbox.mjs` read the environment). Record the verdict for the default-target decision.
- [x] The owner's three answers are recorded in Notes › Owner Decisions (container, `ci:fast`, agents required to use the route). Nothing to ask.

### Phase 1: Runner skeleton, argument grammar and exit codes

**Risk**: Medium. **Dependencies**: Phase 0.

- [x] Add the runner and a sourced library with `server_ready HOST TOOL...` (one SSH round trip, `BatchMode=yes`, `ConnectTimeout=6`).
- [x] Parse `--run <script>` (repeatable, validated `^[A-Za-z0-9:._-]+$`, exit 2 before any ssh), `--host`, `TEST_REMOTE_HOST`, `TEST_LOCAL=1`.
- [x] Unreachable server: exit non-zero with a message that names `TEST_LOCAL=1`. Never fall back silently.
- [x] Capture `STATUS=$?` straight after the ssh call and `exit "$STATUS"` at the end. Use `;` between steps in any `case` arm, and never pipe the run into `tail` or `grep`.

### Phase 2: Sync, container and dependency install

**Risk**: High. **Dependencies**: Phase 1.

- [x] Sync the tree as git sees it: tracked plus untracked-not-ignored, excluding gitignored paths and `node_modules/`; keep `.env` and secrets out. **`--files-from` does not delete stale remote files.** Measured in review 1: with `printf 'a/keep\0' | rsync -a --delete --from0 --files-from=- ./ dst/`, `dst/a/stale` and `dst/rootstale` both survive. So do not use `--files-from` with `--delete`. Use `rsync -a --delete --exclude-from=<list of gitignored paths>`, with plain `--exclude` (never `--delete-excluded`) for `node_modules/`, `.home/` and `.lock-hash`, so the remote install and its cache survive the sync. Prove it with a stale-file case (delete a tracked file locally, confirm it is gone remotely).
- [x] Per-branch remote directory `~ci/agent-skills-test-<branch-slug>`. In a linked worktree `.git` is a file, so no exclude may assume a `.git/` directory.
- [x] Sync `.git` so the history-backed replay test runs; otherwise state in the output that it skips.
- [x] Container image mirroring `test.yml` (built on `node:22-trixie`, not bookworm: see Notes › Parity findings; plus `python3-yaml gawk mawk zsh jq git`, and `shellcheck` if Phase 0 finds a script needing it); `--user "$(id -u):$(id -g)"`, `--rm`, `--cpu-shares 128`.
- [x] `npm ci` in the container, skipped when a stored hash of `package-lock.json` is unchanged.

### Phase 3: Timeout, teardown and shared-host behaviour

**Risk**: Medium. **Dependencies**: Phase 2.

- [x] Wrap the remote run in `timeout --foreground -k 1m <N>m`; the bound has a default and an override.
- [x] Print `uptime` and running containers on the server before the run, so a contended host is visible.
- [x] Stay under `~ci/`; never write to the C: drive; never prune globally.
- [x] Reap stale per-branch directories on request.

### Phase 4: Tests and acceptance runs

**Risk**: Medium. **Dependencies**: Phase 3.

- [x] A guard test (offline, no ssh) for argument validation, exit 2 on `'x;y'`, and the unreachable-server message.
- [x] Run the five acceptance checks in § 9 on .249 and record the evidence in the QA report. (Run in Step 3; `/qa-task` restates the evidence in its report.)
- [x] Mutation-prove each guard: revert the behaviour and confirm a test goes red.

### Phase 5: Docs, `AGENTS.md` and optional `--auto`

**Risk**: Low. **Dependencies**: Phase 4.

- [x] A contributor doc under `docs/contributing/` (usage, host rules, troubleshooting), linked from `docs/contributing/README.md`.
- [x] One `AGENTS.md` line: test runs go to `test:remote` when .249 is up, `TEST_LOCAL=1` otherwise (owner decision 3). `CLAUDE.md` is a symlink to `AGENTS.md`, so edit `AGENTS.md` only. `tests/executable-instructions.test.js` (line 374) checks that `npm run <name>` mentions in documents name a real `package.json` script, so add the `package.json` script before the docs that mention it.
- [x] Optional, not done by decision (see Notes): `--auto` probes the server and falls back to local, for scripted callers. The plain form still fails loudly.

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

Criteria 1, 2 and 5 need the real server, which CI cannot reach, so they are held by a committed record, not a per-PR test: the QA report's "Acceptance runs" section carries each command, its exit status and the relevant output lines. Criteria 3 and 4 are held by the offline guard test (Phase 4).

- [x] `npm run test:remote` on a clean tree runs `ci:fast` on .249 and exits 0. While it runs, the laptop's `ps` shows no `node --test` or `test.sh` process, only `ssh` and `rsync`. Evidence: QA report, "Acceptance runs".
- [x] **A red run is red.** With one assertion broken on a scratch commit, `npm run test:remote` exits non-zero with the failure in its output. The scratch commit is then reverted. Evidence: QA report, "Acceptance runs".
- [x] `npm run test:remote -- --run 'x;y'` exits 2 before any `ssh` (held by the offline guard test).
- [x] With `TEST_REMOTE_HOST=nobody@192.0.2.1` it exits non-zero, names `TEST_LOCAL=1`, and does not run locally (held by the offline guard test).
- [x] The zsh and awk variants run on the server: the output carries no "skipping: zsh missing" or awk-variant skip notice. Evidence: QA report, "Acceptance runs".

### Performance

- [x] `uptime` on the laptop and on .249 is recorded before and after the acceptance run, in the QA report (committed by acceptance; never only the implementation report).
- [x] The route runs at a low CPU weight (`--cpu-shares 128`), verified by `docker inspect` on a live run.

### Code Quality

- [x] Every file the task adds passes `npm run lint:shell` and `npm run format:check`; the offline guard passes under `CI=true`.
- [x] `npm run ci:fast` is green on the final tree.
- [x] `shellcheck` is clean on the new scripts, run through `lint:shell`.

### Migration

- [x] The contributor doc exists and `AGENTS.md` carries the one line (subject to the owner's Phase 0 answer).
- [x] No existing script's behaviour changed (`git diff` of `package.json` shows one added line).

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

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-10
**Quality Score**: 85/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.295.qa.5.test-remote-lan-server-route.md](./task.295.qa.5.test-remote-lan-server-route.md)
- **Gate File**: [task.295.gate.5.test-remote-lan-server-route.yml](./task.295.gate.5.test-remote-lan-server-route.yml)

### Test Coverage Summary
- **Tests Executed**: 19
- **Phases Verified**: 6/6
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No code defect is open. The guard's documented window is wrong (a few seconds, where it is minutes) and a comment points at the wrong Future Improvements item (T295-QA-10).

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.295.qa.5.test-remote-lan-server-route.md`
**Gate File**: `task.295.gate.5.test-remote-lan-server-route.yml`
**Gate Status**: CONCERNS, 85/100 (no high item open; the loop spent its five gates, then the Step 5c PR review found no open coverage finding)

All Definition of Done criteria were verified:

✅ **Acceptance Criteria:** 12 of 12 met. The server-only ones are held by the acceptance runs recorded in the QA report (green exit 0 with 8365 tests and 0 fail on the final tree; a deliberate red run exits 1)
✅ **Tests and CI:** the offline guard passes (19 tests); CI reading 1 SUCCESS, tree-equivalent to `13486822`
✅ **Documentation:** contributor guide, index entry, `AGENTS.md` section and a CHANGELOG entry citing task 295
✅ **Security Review:** PASS; the `--run` and `--host` validators were probed (34 candidates, 0 reproduced)
✅ **Compliance Review:** not applicable (developer tooling)

**Deviation:** the first full `ci:fast` run on the final tree came during `/finalise` and found a hardcoded spawn timeout in the guard test; it was fixed in `13486822` and verified inline, not by a further QA cycle.

**Detailed Verification Log:** See `task.295.dod.1.test-remote-lan-server-route.md`.

**Task marked as ACCEPTED on:** 2026-11-10
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-10 | 1.0     | Initial draft | create-task |
| 2026-11-10 | 1.1     | Review passed (8/10): rsync plan fixed (`--files-from` leaves stale files), evidence location named for server-only criteria, script-before-docs order | review-task |
| 2026-11-10 |         | Status → ready-for-development | review-task |
| 2026-11-10 | 1.2     | Implemented: test:remote runner, container, guard test, docs; four container parity fixes recorded in Notes | develop-task |
| 2026-11-10 |         | Status → ready-for-review | develop-task |
| 2026-11-10 |         | QA gate CONCERNS (80/100) — 2 findings | qa-task |
| 2026-11-10 |         | QA gate FAIL (65/100) — 3 findings, 1 high | qa-task |
| 2026-11-10 |         | Status → in-progress | qa-task |
| 2026-11-10 |         | QA findings fixed after gates 1 and 2 (5 findings, 2 fix cycles); ready for re-gate | qa-fix |
| 2026-11-10 |         | Status → ready-for-review | qa-fix |
| 2026-11-10 |         | QA gate FAIL (65/100) — 3 findings, 1 high | qa-task |
| 2026-11-10 |         | Status → in-progress | qa-task |
| 2026-11-10 |         | QA findings fixed after gate 3 (3 findings, 3 fix cycles in all); ready for re-gate | qa-fix |
| 2026-11-10 |         | Status → ready-for-review | qa-fix |
| 2026-11-10 |         | QA gate CONCERNS (80/100) — 1 finding | qa-task |
| 2026-11-10 |         | QA findings fixed after gate 4 (1 finding, 4 fix cycles in all); ready for re-gate | qa-fix |
| 2026-11-10 |         | QA gate CONCERNS (85/100) — 1 finding | qa-task |
| 2026-11-10 |         | QA finding fixed after gate 5 (wording, 5 fix cycles in all); the PR review reads it | qa-fix |
| 2026-11-10 | 1.3 | DoD passed — accepted (PR #872) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Re-measure and decide
- [x] Re-measure server and laptop
- [x] Check eval:all for network or credential needs
- [x] Record the owner's three answers

### Phase 1: Runner skeleton, argument grammar and exit codes
- [x] Runner and probe
- [x] Argument validation
- [x] Loud failure naming TEST_LOCAL=1
- [x] Exit-code capture

### Phase 2: Sync, container and dependency install
- [x] rsync of the working tree
- [x] Per-branch directory
- [x] Container image and run flags
- [x] Lockfile-keyed npm ci

### Phase 3: Timeout, teardown and shared-host behaviour
- [x] Timeout with -k
- [x] Load print before the run
- [x] Reap stale directories

### Phase 4: Tests and acceptance runs
- [x] Offline guard tests
- [x] Five acceptance runs
- [x] Mutation proof

### Phase 5: Docs, AGENTS.md and optional --auto
- [x] Contributor doc
- [x] AGENTS.md line
- [x] Optional --auto (decided against; see Notes)

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

None.

### Phase 0 decisions and parity findings (2026-11-10)

- **Server re-measured**: node v22.22.1, npm 9.2.0, `package-lock.json` `lockfileVersion` 3 (npm 9 reads it), docker present, zsh and shellcheck missing on the host. Load 2.9 to 5.3 with the tinker-city containers running: contended, so the low CPU weight matters.
- **`eval:all` verdict**: the default driver is replay; the live drivers read `ANTHROPIC_API_KEY` and skip without it, so `eval:all` needs no network or credentials by default. `ci:fast` stays the default target (owner decision 2); `eval:all` is reachable through `--run eval:all`.
- **Parity findings** — the container is only as good as it is faithful to CI, and each gap below made a real test fail remotely until fixed:
  1. `node:22-bookworm` ships jq 1.6 (exits 0 on `jq -e` over empty input) and git 2.39: the zero-byte-lock cases and a gitlink-commit test failed. Fixed by building on `node:22-trixie` (jq 1.7.1, git 2.47).
  2. `shellcheck` must be on PATH under `CI=true` (`tests/ci-tool-skips.test.js`): added to the image.
  3. No UTF-8 locale: zsh printed `§` as escapes and a text match failed. `LANG=C.UTF-8` set.
  4. `HOME=/tmp/...` is refused by the observation-log tests (workspace under a temporary directory): `HOME=/home/node`.
- **`--auto` not built.** A mode that falls back to local on an unreachable server is the silent fall back the route exists to refuse, and its only caller would be a script that should set `TEST_LOCAL=1` itself.
- **A route run syncs the working tree as it is.** Uncommitted edits from another session in the same checkout travel to the server and can fail bundle-freshness tests there (seen in runs 2 to 5). For a verdict on committed work, run from a clean clone.

### Owner Decisions (2026-11-10)

1. **Container**, not a host install of zsh and shellcheck.
2. **Default target is `ci:fast`.** `eval:all` stays reachable through `--run eval:all`, and Phase 0 still checks it for network or credential needs.
3. **Agents must use `test:remote` when .249 is up**, and `TEST_LOCAL=1` only when it is down. Phase 5 adds the `AGENTS.md` line unconditionally.

### Future Improvements

- A cross-repository lock on .249, if overlapping gates recur.
- A per-run lock for one branch (an atomic `mkdir` on the run directory before the sync), if two runs on one branch recur. Today the container-name check is a best-effort guard with a window of minutes.

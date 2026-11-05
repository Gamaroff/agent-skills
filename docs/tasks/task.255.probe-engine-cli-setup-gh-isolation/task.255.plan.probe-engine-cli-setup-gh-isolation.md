---
id: task.255.plan
title: "Implementation Plan: security-probe: a cli: fixture setup cannot reach the host gh"
type: plan
task-ref: task.255.probe-engine-cli-setup-gh-isolation.md
---

# Implementation Plan: security-probe: a cli: fixture setup cannot reach the host gh

> Requirements and success criteria: [task.255.probe-engine-cli-setup-gh-isolation.md](task.255.probe-engine-cli-setup-gh-isolation.md)

## Overview

Reuse the shell arm's run-time `gh` guard for the `cli:` setup: create the harness `bin/gh` trip-wire when a setup is present, give the setup an env whose PATH is `ghFreePath`-shadowed with the trip-wire first, and read the trip-wire marker after the run so a hit declines `needs-fake-gh`.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce the gap

Scratch only (use the session scratchpad, not the repo).

- Put a marker `gh` (a script that writes a file and exits 0) in a scratch dir and prepend it to the PATH of the probe invocation. It stands in for the host binary, so the real `gh` is never called.
- Write a setup that builds the command name from parts, for example `a=g; b=h; "$a$b" --version`. Run the probe on a `cli:` entry with `--fixture-setup` pointing at it.
- Confirm the marker file appears (gap reproduced) and `namesGh(setup, root)` returns false (call it from a one-line `command node -e` import of the exported function).
- Run a setup that only uses `git init` through the shell-argv arm with a `ghFreePath` PATH to confirm `git` stays reachable.

### Phase 2: Guard the cli: setup

**Files to modify:** `shared/resources/security-probe.mjs`

- Where `harnessDir/bin/gh` is written (`:1989`, `if (isShellForm || isFenceForm || isShellArgvForm)`), also write it when `isCliForm && setupPath !== null`. Reuse `tripwireGh(join(harnessDir, GH_TRIPPED))` unchanged.
- In `runCliCase`, build a setup-only env from the case env just before the `runCaseSetup` call (`:2960`): copy `env`, set `PATH = ghFreePath(env.PATH, join(harnessDir, "path"), fixtureDir)`, then prepend `join(harnessDir, "bin")`. Pass that env to `runCaseSetup`; keep passing the untouched `env` to the CLI spawn. If `harnessDir` is not already in scope in `runCliCase`, thread it from its caller the way the shell-argv arm receives it.
- Extend `ghTripped` (`:2151`) to cover the `cli:` form: `(isShellForm || isFenceForm || isShellArgvForm || (isCliForm && setupPath !== null)) && existsSync(...)`.
- The `needs-fake-gh` decline text (`:2173`) says "invoked `gh` at run time with no --fake-gh". For the `cli:` form say the setup did, and that the `cli:` form has no `--fake-gh`, so the remedy is the `shell-argv:` form.
- Do not touch `runCaseSetup` beyond what the types need; the PATH policy arrives through `env`.

### Phase 3: Tests and mutations

**Files to modify:** `shared/resources/tests/security-probe.test.mjs`, next to the task.254 `cli:` setup tests.

- Obfuscated call: a committed-style fixture setup (under `shared/resources/tests/fixtures/security-probe/`) that builds the name from parts; assert `needs-fake-gh` and that the marker `gh` on the test's PATH never wrote its file. Use a **different** construction for the control case.
- `git`-only setup still runs and the case is scored.
- Entry env unchanged: a `cli:` entry that prints `process.env.PATH` shows no `bin/gh` directory in it.
- Mutations: (1) skip creating `bin/gh`; (2) skip `ghFreePath`; (3) drop `cli:` from the `ghTripped` check. Restore from a byte-identical copy after each and diff.

### Phase 4: Documentation, bundles and proof

- `probe-boundary-rule.md` currently says a `cli:` setup naming `gh` is declined. Add that an indirect spelling is caught at run time, and restate the inherited limits (absolute path, PATH prepend, backgrounded call).
- `npm run bundle`, then `npm run bundle:check`.
- `CHANGELOG.md`: an entry under Unreleased > Fixed citing task 255.

## Key Patterns and References

- `caseShellEnv` (`:3114`) is the pattern to mirror for the env; do not call it from `runCliCase`, since it also overlays the shell-arm fake-gh handling.
- The harness dir is under the work dir, which the escape sentinel skips.

## Testing Approach

`command node --test shared/resources/tests/security-probe.test.mjs`, then `npm test`. The marker `gh` keeps every test off the real binary.

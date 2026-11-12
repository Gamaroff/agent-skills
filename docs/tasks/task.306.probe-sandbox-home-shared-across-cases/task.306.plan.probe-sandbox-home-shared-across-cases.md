---
id: task.306.plan
title: "Implementation Plan: Probe sandbox HOME shared across cases"
type: plan
task-ref: task.306.probe-sandbox-home-shared-across-cases.md
---

# Implementation Plan: Probe sandbox HOME shared across cases

> Requirements and success criteria: [task.306.probe-sandbox-home-shared-across-cases.md](task.306.probe-sandbox-home-shared-across-cases.md)

## Overview

Give each (case, shell) run its own `HOME` and `TMPDIR` under its fixture directory, and decide how the escape watch treats a write inside that private `HOME`. Everything else about the sandbox stays.

## Phase-by-Phase Implementation Guide

### Phase 1: Measure and decide

**Files to read:**
- `shared/resources/security-probe.mjs` — `sandboxHome` is made once at `:2123`; `caseShellEnv` at `:3297` passes it; `runShellArgvCase` at `:3468` builds a fresh fixture dir per (case, shell) at `:3540`; `snapshotTree(sandboxRoot, workDirName)` at `:2230`, `:2255`, `:2652`, `:2670`.

**Reproduction fixture** (a small script committed under `shared/resources/tests/fixtures/security-probe/`):
- `take-lock.sh` takes one argument, a lock name. It runs `mkdir "$HOME/locks/$1"` (after `mkdir -p "$HOME/locks"`) and exits 10 when the directory already exists, 0 otherwise.
- Run it as one legitimate case with `--entry shell:<path>`. Expected today: bash exits 0, zsh exits 10, so the case reads as refused, and `$HOME/locks` is reported as an escape.

**Decision to record:** a write inside the case's own `HOME` is not an escape for a `legitimate` case. For a `hostile` case, keep it as a reported write (the same record field as an escape, or a named sibling). Write the choice and the reason in the task's Change Log.

### Phase 2: Per-run HOME and TMPDIR

**Files to modify:**
- `shared/resources/security-probe.mjs` — in each shell arm, after `materialiseFixture(...)` returns `fixtureDir`, create `join(fixtureDir, ".probe-home")` and `join(fixtureDir, ".probe-tmp")` and pass them to `caseShellEnv` in place of the run-wide `sandboxHome` and `sandboxTmp`. Keep `caseShellEnv` the one definition so the arms cannot drift.
- Apply the Phase 1 rule where the watch reports a write.

**Exact changes:** the argument object to `caseShellEnv` changes from `{ caseDir, sandboxHome, sandboxTmp, ... }` to `{ caseDir, sandboxHome: perRunHome, sandboxTmp: perRunTmp, ... }`. Check that `fixtureProblem` still refuses a fixture that sets `HOME`, `TMPDIR` or `LC_ALL` (the test at `security-probe.test.mjs:5222`).

Then `npm run bundle` and commit the four generated copies.

### Phase 3: Tests and prompt

**Files to modify:**
- `shared/resources/tests/security-probe.test.mjs` — add three cases near the shell-arm tests, run under both shells (the file already loops over `lang`).
- `shared/resources/finalise-dod-security-prompt.md` — find the advice on state-changing controls (read it first; I did not locate the passage) and drop or shorten it.

**Mutation proofs:** restore the shared `HOME` and confirm the legitimate-case test goes red; remove the hostile report and confirm that test goes red.

### Phase 4: `$(( ))` audit

`git ls-files '*.sh' | xargs grep -nE '\$\(\(' ` and, for each hit, whether the operands come from a file, a command or an argument, whether `10#` is used, and whether a length cap guards it. A list in the QA report; no fixes in this task.

## Key Patterns and References

- `caseShellEnv` is the one place the shell arms build their environment; change it there.
- A generated copy is never edited by hand (`npm run bundle`).
- `docs/contributing/traps.md` carries the workaround; remove or shorten the entry when this lands.

## Testing Approach

- Offline: `shared/resources/tests/security-probe.test.mjs`, on the LAN server first (`npm run test:remote -- --run ci:fast`), then `CI=true` before pushing.
- Live: re-run task.296's plan with its two `take` entries legitimate again and expect 0 reproduced, 0 escaped.

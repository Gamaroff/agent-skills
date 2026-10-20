---
id: task.181.plan
title: "Implementation Plan: security-probe — a shell-argv: entry form"
type: plan
task-ref: task.181.probe-engine-shell-argv-entry-form.md
---

# Implementation Plan: security-probe — a `shell-argv:` entry form

> Requirements and success criteria: [task.181.probe-engine-shell-argv-entry-form.md](task.181.probe-engine-shell-argv-entry-form.md)

## Overview

Clone `cli:`'s path through the engine for a shell interpreter: same `--argv` template, same verdict, same record shape. Add one thing `cli:` never needed: a per-run setup script that builds the scratch repository a shell boundary runs in.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first (red)

**File:** `shared/resources/tests/security-probe.test.mjs` — a new block after the cli entry form block (`// ── The cli entry form (task.144)`).

- A fixture script under the test's temp root, `two-args.sh`: refuses (exit 1) unless `$1` is a plain name and `$2` names an existing file; prints `$#` to stderr so a split `{input}` is visible.
- `resolveEntry("shell-argv:<rel>")` → `{ ok: true, kind: "shell-argv", entryPath }`; `shell-argv:../outside.sh` → declined with the same reason `shell:` gives.
- CLI: `--entry shell-argv:<p>` with no `--argv` → exit 2, stderr names `bad-argv`, no record file. `--entry shell:<p> --argv '[…]'` → still exit 2 `bad-argv`.
- A cases file with inputs `"a b"`, `"$(touch PWNED)"`, `"-n"`, `"../x"`: each reaches the script as one element (`$#` is 2), no `PWNED` file appears, the verdict per case is the script's exit.
- `--fixture-setup` with a setup that `git init`s the fixture and one that exits 3: the first run proceeds; the second is `errored` for every (case, shell). `--fixture-setup` with `cli:` → exit 2.
- A script using a bash-only construct (`[[ … ]]`, `${x,,}`): under the zsh arm it still runs as bash — not `rejected`.
- A case `fixture.files` entry is visible to the setup script; a malformed `fixture` declines the case.
- A `shell-argv:` script naming `gh`, no `--fake-gh` → declined `needs-fake-gh`; `--args-json` with `shell-argv:` → exit 2 `bad-args`.
- Update the three assertions pinning `/cli: entry form only/` (`security-probe.test.mjs:2420`, `:2421`, `:2465`).

### Phase 2: The entry form

**File:** `shared/resources/security-probe.mjs`

Line numbers: `develop` at `9af9b0f1`. Work through the task's § 3 form-dispatch table row by row; it is the checklist.

- Beside `CLI_PREFIX` (`:563`): `export const SHELL_ARGV_PREFIX = "shell-argv:";`. In `resolveEntry` (`:426`) add the branch, reusing the `shell:` containment branch, and return `kind: "shell-argv"` (the prefixes are disjoint; order is not load-bearing).
- At `:1050–1090` add `isShellArgvForm` and `takesArgv = isCliForm || isShellArgvForm`; keep the refusal text accurate: `"--argv applies to the cli: and shell-argv: entry forms only"`. Mirror it in `main()` at `:3222–3240`, and add `SHELL_ARGV_PREFIX` to the `--args-json` refusal at `:3264–3267`.
- `runShellArgvCase(c, opts)`: copy `runCliCase` (`:1981`) and change the spawn to `[shell, ...noRcFlags(shell), "-c", 'bash "$@"', shell, entryPath, ...expandTemplate(template, input, fixtureDir)]` for each shell from `probeShells()` (`:820`) — the shell is the caller, bash the interpreter, as `runShellCase` (`:1735`) does. Reuse `caseEnv` (`:1671`) and `watchedSpawn` (`:1688`). Write the case `fixture` first (`fixtureProblem` `:2194`, the writer in `runFenceCase` `:2486–2545` — extract a shared helper rather than copy it). Then, when `fixtureSetup` is set: `watchedSpawn(["bash", setupPath, fixtureDir], …)`; non-zero, timeout or launch failure → push `{ outcome: "errored", detail: "fixture setup exited N" }` for that shell and skip the script.
- `gh`: `shell-argv:` joins the shell forms at `:1152` (`--fake-gh`), `:1198` (`needs-fake-gh`, over the entry and the setup), `:1305`/`:1319`/`:1441` (trip-wire, shells, tripped).
- `--fixture-setup`: add to the flag map beside `--cases-file` (`:3124`); resolve it through the same containment as the entry; exit 2 `bad-fixture-setup` with any other form; record it as `fixture_setup` in the run record.
- Dispatch: in the case loop (`:1322–1375`) add `isShellArgvForm` → `runShellArgvCase`. `controlKey` (`:2722–2729`): `shell-argv:` keys like `cli:`.

### Phase 3: Routing and proof

- Routing: in each document of the task's § 7 population, add `shell-argv:path` beside `cli:path` in the forms list, with the routing clause "a shell script that takes several arguments or flags → `shell-argv:` with an `--argv` template and, when it needs a repository, `--fixture-setup`". In `probe-boundary-rule.md` §5.1 remove "a multi-positional shell script" from the declined list.
- Proof fixtures under `shared/resources/tests/fixtures/shell-argv/`:
  - `reenter-qa-setup.sh <fixture-dir>`: `git init`, one code commit, a `docs/tasks/task.1.x/` work item with `task.1.gate.1.x.yml` whose `head:` is that commit, a GAPS `task.1.dod.1.x.md`, a report, and a halt snapshot at `$PIPELINE_HALT_SNAPSHOT` inside the fixture; a second commit outside the doc dir so code moved.
  - `reenter-qa-cases.json`: the legitimate `docs/tasks/task.1.x` (expect exit 0) plus hostile doc-dirs (`../`, `/etc`, `.`, `-n`, `$(touch PWNED)`, a path with a space) with expected exits 1 or 2.
- An integration test in `security-probe.test.mjs` runs the task's § 8 command and asserts `totals.executed > 0` and that no case stops at the usage line; the record goes to scratch and is cited in the DoD. `reenter-qa-setup.sh` commits with `git -c user.name=probe -c user.email=probe@example.invalid` — the sandbox `HOME` has no git identity.
- `security-input-corpus.mjs:67`: the `fixture` rule names `shell-argv:` beside `fence:`.

## Key Patterns and References

- `cli:`'s whole-element slot rule and `parseArgvTemplate` are reused unchanged — no new template grammar.
- `reenter-qa-after-finalise.test.sh`'s `mkrepo` builds the same repository shape the setup script needs; lift its steps rather than re-deriving them.

## Testing Approach

- Unit and CLI cases in `security-probe.test.mjs`, red before Phase 2.
- Mutation proof: split `{input}` on whitespace; map a failing setup to `rejected`; map a crash to `rejected` — each must turn a named test red.

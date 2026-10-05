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
- `--fixture-setup` with a setup that `git init`s the fixture and one that exits 3: the first run proceeds; the second is `errored` for every (case, shell).

### Phase 2: The entry form

**File:** `shared/resources/security-probe.mjs`

- Beside `CLI_PREFIX` (`:485`): `export const SHELL_ARGV_PREFIX = "shell-argv:";`. In `resolveEntry` (`:371`) test it before `SHELL_PREFIX`, reusing the `shell:` containment branch, and return `kind: "shell-argv"`.
- At `:954–975` widen `isCliForm` (`:954`) to `takesArgv = kind === "cli" || kind === "shell-argv"`; keep the refusal text accurate: `"--argv applies to the cli: and shell-argv: entry forms only"`. Mirror it in `main()` at `:2490`.
- `runShellArgvCase(c, opts)`: copy `runCliCase` (`:1784`) and change the spawn to `[shell, entryPath, ...expandTemplate(template, input, fixtureDir)]` for each shell from `probeShells()` (`:738`). Reuse `caseEnv` (`:1474`) and `watchedSpawn` (`:1491`). Before the spawn, when `fixtureSetup` is set: `watchedSpawn(["bash", setupPath, fixtureDir], …)`; non-zero → push `{ outcome: "errored", detail: "fixture setup exited N" }` for that shell and skip the script.
- `--fixture-setup`: add to the flag map beside `--cases-file` (`:2384`); resolve it through the same containment as the entry; record it as `fixture_setup` in the run record.
- Dispatch: where the case loop calls `runCliCase` (`:1147`) for `kind === "cli"`, add `kind === "shell-argv"` → `runShellArgvCase`.

### Phase 3: Routing and proof

- Routing: in each document of the task's § 7 population, add `shell-argv:path` beside `cli:path` in the forms list, with the routing clause "a shell script that takes several arguments or flags → `shell-argv:` with an `--argv` template and, when it needs a repository, `--fixture-setup`". In `probe-boundary-rule.md` §5.1 remove "a multi-positional shell script" from the declined list.
- Proof fixtures under `shared/resources/tests/fixtures/shell-argv/`:
  - `reenter-qa-setup.sh <fixture-dir>`: `git init`, one code commit, a `docs/tasks/task.1.x/` work item with `task.1.gate.1.x.yml` whose `head:` is that commit, a GAPS `task.1.dod.1.x.md`, a report, and a halt snapshot at `$PIPELINE_HALT_SNAPSHOT` inside the fixture; a second commit outside the doc dir so code moved.
  - `reenter-qa-cases.json`: the legitimate `docs/tasks/task.1.x` (expect exit 0) plus hostile doc-dirs (`../`, `/etc`, `.`, `-n`, `$(touch PWNED)`, a path with a space) with expected exits 1 or 2.
- Run the integration command in the task's § 8 and keep the record in the PR description (the record itself goes to scratch, not the tree).

## Key Patterns and References

- `cli:`'s whole-element slot rule and `parseArgvTemplate` are reused unchanged — no new template grammar.
- `reenter-qa-after-finalise.test.sh`'s `mkrepo` builds the same repository shape the setup script needs; lift its steps rather than re-deriving them.

## Testing Approach

- Unit and CLI cases in `security-probe.test.mjs`, red before Phase 2.
- Mutation proof: split `{input}` on whitespace; map a failing setup to `rejected`; map a crash to `rejected` — each must turn a named test red.

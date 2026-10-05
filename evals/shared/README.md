# evals/shared — Runner, Drivers, and Shared Infrastructure

Shared harness used by all skill eval suites. Each skill's scenarios live under `evals/<skill-name>/`.

## Structure

```
evals/shared/
├── runner.mjs          # Generic scenario runner (works for any skill)
├── repeat.mjs          # Runs one scenario N times and reports a pass rate
├── assertions.mjs      # Structural assertion functions (fileExists, frontmatterHas, …)
├── drivers/
│   ├── types.mjs       # AgentDriver JSDoc contract
│   ├── replay.mjs      # Fixture-based driver (default — no model calls)
│   ├── claude-sdk.mjs  # Live driver via @anthropic-ai/claude-agent-sdk
│   └── claude-cli.mjs  # Live driver via claude CLI subprocess
├── lib/
│   ├── tracker-cleanup.mjs   # Receipt-driven Jira/GitHub issue cleanup
│   ├── git-sandbox.mjs       # Throwaway git repos for eval sandboxes
│   ├── gh-sandbox.mjs        # Injectable GH PR creation helper (skips when GH_TOKEN absent)
│   ├── fake-gh.mjs           # Fake `gh` for hermetic sandboxes — serves reads, refuses writes
│   └── pipeline-recorder.mjs # Wraps a driver to record Skill tool-use events
└── tests/
    ├── drivers.test.mjs
    ├── assertions.test.mjs
    ├── tracker-cleanup.test.mjs
    ├── git-sandbox.test.mjs
    ├── fake-gh.test.mjs
    ├── runner-setup.test.mjs
    ├── repeat.test.mjs
    ├── gh-sandbox.test.mjs
    ├── pipeline-recorder.test.mjs
    └── develop-task-assertions.test.mjs
```

## Runner contract

```bash
node evals/shared/runner.mjs <scenario-dir> [--driver <name>]
# or via DRIVER env var:
DRIVER=claude-sdk node evals/shared/runner.mjs evals/create-task/scenarios/01-happy
```

The runner reads `<scenario-dir>/scenario.json` and dispatches to the selected driver. Exit 0 = all assertions passed (or scenario skipped). Exit 1 = failure.

### Opt-in scenario fields

Each is keyed on its own `scenario.json` field, so a scenario that sets none runs exactly as before.

| Field | What it does |
| --- | --- |
| `setup` | Path (relative to the scenario dir) of a module exporting `setup({ sandbox, scenarioDir, repoRoot, scenario })`. Awaited after the sandbox exists and before the driver runs — for **every** driver, replay included, so replay and live assert against the same prepared tree. It may return `{ env }`, merged into the driver env; a `PATH` there is **prefixed** to the runner's `PATH`. A setup that throws (or does not resolve) fails the scenario with exit 1 and still removes the sandbox unless `KEEP_SANDBOX` is set. |
| `cliArgs` | Array appended to the claude-cli driver's `claude` arguments — e.g. a scoped `--allowedTools` list, since `claude -p` with no permission flag cannot run `Bash`. |
| `liveAssertions` | Assertions run after `assertions`, only when the driver is not `replay` — for facts only a live run can produce, such as "the fake `gh` was called". |
| `live.minPass` | Read by `repeat.mjs` when `--min-pass` is not given: a count out of 5 (1..5), scaled to `--runs`. |

`EVAL_SKIP_EXIT`, `EVAL_DRIVER_ERROR_EXIT` and `EVAL_FAIL_EXIT` are each a code in 3–125, and anything else is ignored. They make the runner exit with that code instead of 0 on a skip, 1 on a driver error, or 1 when assertions ran and failed. `repeat.mjs` sets all three.

`EVAL_TIMEOUT_MS` overrides the claude-cli driver's 5-minute timeout (set it in the shell or in `env.json`).

### Repeat runner — live pass rates

```bash
DRIVER=claude-cli node evals/shared/repeat.mjs <scenario-dir>... [--runs N] [--min-pass K]
```

One live run is one sample. `repeat.mjs` runs the real runner N times per scenario,
**sequentially**, because live runs share `~/.claude` state. It prints `run i/N: pass|fail` per run
and `<scenario>: passed P/N (min K)` per scenario. N defaults to `$EVAL_RUNS` (empty reads as
unset), else 5. K is `--min-pass` when given (1..N). Otherwise K is the scenario's `live.minPass`, a
count out of **5** that is **scaled** to N as `ceil(minPass × N / 5)`: 4/5 becomes 8/10 or 3/3, and
the output names the scaling. Without `live.minPass`, K is N.

**Exit status — the one contract.** `repeat.mjs` owns it, so a caller never re-maps it. The npm
script passes every scenario in one call for that reason. Its earlier shell loop collapsed 3 to 1.

| Exit | Meaning |
| --- | --- |
| 0 | every scenario met its K |
| 1 | at least one scenario fell below its K, and every run of every scenario ran |
| 2 | usage: a bad or valueless flag, K outside 1..N, `live.minPass` outside 1..5, or a missing or malformed `scenario.json`. All are checked before any run starts |
| 3 | **could not run** — any run that was not a verdict. It covers a **skip** (the driver is unavailable, or a `requiresLiveDriver` scenario ran under replay) and a **driver error** (`claude -p` exited non-zero: no credit, a crash, or a timeout). It also covers anything else the runner did instead of judging: a setup error, an unknown `DRIVER`, a crash, a signal or a spawn failure. It stops at the first such run and prints no pass rate for runs that did not happen |

**The verdict is positive.** The runner exits `EVAL_FAIL_EXIT` (5, requested by `repeat.mjs`)
**only** when assertions ran and failed, and 0 when they passed. `repeat.mjs` reads every other
status as could-not-run, so a new way for the runner to fail cannot be misread as a failed run.
QA cycles 1 and 2 had enumerated non-verdict exits one at a time, and cycle 3 found another.
`EVAL_SKIP_EXIT=3` is still requested, because the runner's default for a skip is 0, which would
read as a pass. `EVAL_DRIVER_ERROR_EXIT=4` only sharpens the message. Each must be a code in 3–125;
anything else is ignored, and with none set the runner exits as `eval:all` expects. Before task.185's QA cycles, a machine without `claude` reported
`passed 5/5`, and a key with no credit reported `passed 0/5` with a regression's exit code. A
timeout counts as could-not-run: raise `EVAL_TIMEOUT_MS` if a scenario legitimately needs longer.

**Live runs use the shell's `claude` auth.** An `ANTHROPIC_API_KEY` in the environment takes
precedence over a claude.ai login; if its account cannot pay, every run fails in seconds with
`Credit balance is too low` (the driver's error now carries `claude`'s stdout, where that line
appears). Unset the key for the run — `env -u ANTHROPIC_API_KEY npm run eval:review-pr:cli` — to use
the login instead.

## Adding a driver for another agent

1. Drop `evals/shared/drivers/<name>.mjs` implementing the `AgentDriver` contract in `drivers/types.mjs`
2. Export `{ name, isAvailable, run }` — `run(scenario, sandboxDir)` returns `void` (throws on error)
3. Register the new driver name in `runner.mjs` driver-selection switch
4. Add a smoke test in `evals/shared/tests/drivers.test.mjs`

## Adding a structural assertion

`noFileMatching(dir, regex)` passes when no file under `dir` (recursive) has a basename matching
`regex`; a missing `dir` passes. It pins "writes no file of this kind anywhere".

1. Export a new function from `evals/shared/assertions.mjs`
2. Register it in the `runner.mjs` assertion dispatcher
3. Add a test in `evals/shared/tests/assertions.test.mjs`

## Shared lib helpers

### git-sandbox

`createSandbox({ fixtureFiles={}, initialCommit=true, branch="develop" })` — creates a throwaway git repo in a tmpdir prefixed `agent-skills-eval-`. Returns `{ path, run, commit, branchList, cleanup }`.

- `run(cmd)` — runs a shell command in the sandbox, returns stdout
- `commit(msg)` — stages all changes and creates a commit
- `branchList()` — returns array of local branch names
- `cleanup()` — removes the tmpdir (noop on failure)

Pass `dir` to initialise the repo in a caller-owned directory instead of a new tmpdir — a `setup`
hook building a repo inside the runner's sandbox does this. `cleanup()` then leaves the directory
alone: the runner owns it.

Use for any scenario that needs a real git repo without touching the working tree.

### fake-gh

`installFakeGh(sandbox, fixtures)` — writes a `gh` launcher to `<sandbox>/.eval/bin/` and returns
`{ PATH }` for a `setup` hook to hand back. It also writes the fixtures to
`.eval/gh-fixtures.json`, creates an **empty** `.eval/gh-calls.jsonl` (so a "no refused call"
assertion is well-defined in a run that makes no `gh` call — `fileDoesNotMatch` fails on a missing
file), and an empty `.eval/gh-config/`.

- **Reads** (`pr view`, `pr diff`, `pr list`, `issue view`, `repo view`, `api` GET, `auth status`)
  are served from the fixtures; `--json a,b` selects fields, `-q/--jq` is piped through the real
  `jq`. A known kind with a missing key answers as `gh` does (exit 1, `GraphQL: Could not resolve…`),
  logged `"notFound": true`.
- **Writes** (`pr comment|review|edit|merge|…`, `issue comment|…`, `api` with a non-GET method or a
  field flag) are **refused**: exit 1, logged `"refused": true`. "Never posts without asking" becomes
  an assertion on the log.
- **Anything else** is `"unhandled": true`, exit 1 — a gap in the fixtures fails loudly instead of
  being guessed at.

The fake only wins through `PATH`. Point `GH_CONFIG_DIR` at the empty `.eval/gh-config` and blank
`GH_TOKEN`/`GITHUB_TOKEN` in the hook's env, so a real `gh` reached by absolute path is
unauthenticated — the claude-cli driver spreads `process.env` into the agent, so blanking the token
alone leaves the keyring.

### gh-sandbox

`createGhSandbox({ repo, branch, base, title, body, exec })` — creates a GitHub PR (or returns a skipped receipt when `GH_TOKEN` is absent or `repo`/`branch` are missing).

- `exec` is injectable — pass a stub for unit tests; defaults to real `gh` CLI
- Skipped receipts have `{ skipped: true, reason }` — `prCreated` assertion treats these as a pass
- Success receipts have `{ skipped: false, pr: { number, url, baseRefName } }`

### pipeline-recorder

`wrapDriver(driver)` — wraps any `AgentDriver`, intercepting `Skill` tool-use events. Returns `{ driver: WrappedDriver, events: RecordedEvent[] }`.

- `RecordedEvent = { skill, args, status: "started", timestamp }`
- `events` array is mutable — inspect after the scenario run
- Caller writes `events` to `.eval/pipeline-events.json` for persistence across process boundaries

## Sabotage-verify workflow

To confirm an assertion actually catches a bug:

1. Break the fixture or scenario expectations in a scratch branch
2. Run the affected scenario — confirm exit 1
3. Revert — confirm exit 0

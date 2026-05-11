# evals/shared — Runner, Drivers, and Shared Infrastructure

Shared harness used by all skill eval suites. Each skill's scenarios live under `evals/<skill-name>/`.

## Structure

```
evals/shared/
├── runner.mjs          # Generic scenario runner (works for any skill)
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
│   └── pipeline-recorder.mjs # Wraps a driver to record Skill tool-use events
└── tests/
    ├── drivers.test.mjs
    ├── assertions.test.mjs
    ├── tracker-cleanup.test.mjs
    ├── git-sandbox.test.mjs
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

## Adding a driver for another agent

1. Drop `evals/shared/drivers/<name>.mjs` implementing the `AgentDriver` contract in `drivers/types.mjs`
2. Export `{ name, isAvailable, run }` — `run(scenario, sandboxDir)` returns `void` (throws on error)
3. Register the new driver name in `runner.mjs` driver-selection switch
4. Add a smoke test in `evals/shared/tests/drivers.test.mjs`

## Adding a structural assertion

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

Use for any scenario that needs a real git repo without touching the working tree.

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

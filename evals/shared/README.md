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
│   └── tracker-cleanup.mjs  # Receipt-driven Jira/GitHub issue cleanup
└── tests/
    ├── drivers.test.mjs
    ├── assertions.test.mjs
    └── tracker-cleanup.test.mjs
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

## Sabotage-verify workflow

To confirm an assertion actually catches a bug:

1. Break the fixture or scenario expectations in a scratch branch
2. Run the affected scenario — confirm exit 1
3. Revert — confirm exit 0

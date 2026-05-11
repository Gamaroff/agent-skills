# evals/create-task — Eval Coverage for `create-task`

End-to-end eval scenarios for the `create-task` skill. These run as L4 in the four-layer suite alongside unit (L1), fixture (L2), and protocol (L3) tests.

## Scenarios

| Scenario | Mode | What it covers |
| --- | --- | --- |
| `01-happy` | replay | All 11 mandatory sections, ≥2 source citations, valid frontmatter, tracker payload shape (dryRun) |
| `02-id-collision` | replay | HALT — pre-existing `task.42.*` untouched, no new file written, `halt.log` emitted |
| `03-tracker-live` | **live only** | Real Jira/GitHub issue created, receipt validated, issue cleaned up after |

## Running

```bash
# All create-task scenarios (replay — no creds):
npm run eval:create-task:all

# Single scenario:
node evals/shared/runner.mjs evals/create-task/scenarios/01-happy

# Live model (needs ANTHROPIC_API_KEY):
npm run eval:create-task:sdk

# Live tracker (needs ANTHROPIC_API_KEY + GH_TOKEN or JIRA_TOKEN):
DRIVER=claude-sdk node evals/shared/runner.mjs evals/create-task/scenarios/03-tracker-live
```

See [`docs/contributing/evals/README.md`](../../docs/contributing/evals/README.md) for full environment setup, token sources, and CI integration.

## Scenario layout

Each scenario directory contains:

```
<scenario>/
├── scenario.json    # name, skill, description, prompt, assertions[]
├── answers.jsonl    # pre-recorded Q&A for replay driver
├── env.json         # env vars injected into the sandbox
└── replay/          # fixture artefacts the replay driver places in $SANDBOX
```

## Adding a scenario

1. Create `evals/create-task/scenarios/<name>/` with `scenario.json`, `answers.jsonl`, `env.json`
2. Run the skill live against a sandbox, capture output into `replay/`
3. Add assertions to `scenario.json` (use `$SANDBOX` prefix for all paths)
4. Run `node evals/shared/runner.mjs evals/create-task/scenarios/<name>` — confirm green
5. Sabotage one assertion, confirm red, revert

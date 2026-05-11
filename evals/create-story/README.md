# evals/create-story — Eval Coverage for `create-story`

End-to-end eval scenarios for the `create-story` skill. These run as L4 in the four-layer suite alongside unit (L1), fixture (L2), and protocol (L3) tests.

## Scenarios

| Scenario | Mode | What it covers |
| --- | --- | --- |
| `01-happy` | replay | Required template sections, ≥2 source citations, valid frontmatter, sprint-status merge |
| `02-missing-core-config` | replay | HALT — no `core-config.yaml` in sandbox → no story file written, `halt.log` emitted |

## Running

```bash
# All create-story scenarios (replay — no creds):
npm run eval:create-story:all

# Single scenario:
node evals/shared/runner.mjs evals/create-story/scenarios/01-happy

# Live model (needs ANTHROPIC_API_KEY):
npm run eval:create-story:sdk
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

1. Create `evals/create-story/scenarios/<name>/` with `scenario.json`, `answers.jsonl`, `env.json`
2. Run the skill live against a sandbox, capture output into `replay/`
3. Add assertions to `scenario.json` (use `$SANDBOX` prefix for all paths)
4. Run `node evals/shared/runner.mjs evals/create-story/scenarios/<name>` — confirm green
5. Sabotage one assertion, confirm red, revert

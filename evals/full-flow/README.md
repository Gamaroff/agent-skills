# Full-flow evals

L4 of the eval pyramid for `create-task` / `create-story`. L1/L2/L3 (unit, fixture, protocol checker) live under `skills/*/tests/` and `tests/`.

## What this does

Drives a skill end-to-end against a scenario directory, then runs **structural** assertions on the artefacts produced (files, frontmatter, source citations, tracker payload). Never asserts prose equality — LLM output drifts.

## Run

```
npm run eval:full-flow                                    # 01-happy-task, replay driver
npm run eval:full-flow:all                                # every scenario under scenarios/
npm run eval:full-flow:cli                                # DRIVER=claude-cli
npm run eval:full-flow:sdk                                # DRIVER=claude-sdk (stub)

DRIVER=replay     node evals/full-flow/runner.mjs evals/full-flow/scenarios/01-happy-task
DRIVER=claude-cli node …
KEEP_SANDBOX=1    node …                                  # leave sandbox on disk
```

Assertion + driver helpers themselves are unit-tested:

```
node --test evals/full-flow/tests/*.test.mjs
```

## Drivers

Drivers are pluggable — the runner doesn't import any agent SDK directly. Pick via the `DRIVER` env var; default is `replay`. Add a new agent backend by dropping a file at `drivers/<name>.mjs` that satisfies the `AgentDriver` contract in `drivers/types.mjs`.

| Driver | What it does | Requires | Status |
| --- | --- | --- | --- |
| `replay` (default) | Copies `scenarios/<name>/replay/**` into a temp sandbox. No agent invoked. CI gate. | nothing | working |
| `claude-cli` | Shells out to the user's `claude` binary in the sandbox. No SDK dependency, no API-key plumbing in this repo — the binary owns auth. | `claude` on PATH | working |
| `claude-sdk` | Programmatic invocation via `@anthropic-ai/claude-agent-sdk`. Richer Q&A interception. | SDK install + `ANTHROPIC_API_KEY` | stub — see file header |

When a driver's prerequisites are missing the runner prints `[<driver>] skipped: <reason>` and exits 0 (skip ≠ fail). Use `DRIVER=replay` in CI to gate every push; promote a scenario to a live driver locally before merging.

### Legacy `MODE`

`MODE=replay|live` still works for one release window: `MODE=live` routes to `DRIVER=claude-sdk` with a deprecation note on stderr. New scripts should use `DRIVER` directly.

### Adding a driver for another agent

Drop a file at `drivers/<name>.mjs`:

```js
import { spawnSync } from "node:child_process";

const driver = {
  name: "my-agent",
  async isAvailable() {
    // check for binary / SDK / API key; return { ok: false, reason } if missing
    return { ok: true };
  },
  async run(ctx) {
    // ctx: { sandbox, skill, skillRoot, prompt, answers, env }
    spawnSync("my-agent", ["-p", ctx.prompt], { cwd: ctx.sandbox, /* … */ });
    return { remainingAnswers: [] };
  },
};
export default driver;
```

Scenarios and assertions don't change. The `claude-cli` driver is ~60 lines and is the working reference for any subprocess-driven agent (Gemini CLI, Goose, Aider, Ollama-backed agents, …).

## Scenarios

| Scenario | Skill | What it covers |
| --- | --- | --- |
| `01-happy-task` | create-task | Happy path: all 11 sections, ≥2 citations, frontmatter, tracker payload |
| `02-happy-story` | create-story | Happy path: required template sections, ≥2 citations, sprint-status merge |
| `03-task-id-collision` | create-task | HALT path: id collision — original file untouched, no new file, halt.log written |
| `04-story-missing-core-config` | create-story | HALT path: missing core-config.yaml — no story file, halt.log written |
| `05-tracker-payload-live` | create-task | **Live** Jira/GitHub round-trip — creates real issue, asserts receipt, then cleans up. Requires live driver; skipped under replay. See its own README. |

Happy-path scenarios verify positive artefact shape. HALT scenarios verify negative existence (`fileAbsent`) + halt-log presence, so the harness can distinguish a clean refusal from silent overwrite.

## Scenario layout

```
scenarios/<name>/
├── scenario.json     # skill name, prompt, declarative assertion list
├── env.json          # env vars (DRY_RUN=1, EVAL_MODE=1, …)
├── answers.jsonl     # scripted answers for AskUserQuestion / Bash reads
└── replay/           # pre-captured fixture tree (used by replay mode)
    ├── docs/tasks/…
    └── .eval/tracker-payload.json
```

### `scenario.json` schema

```json
{
  "name": "01-happy-task",
  "skill": "create-task",
  "prompt": "Create a task for …",
  "assertions": [
    { "fn": "fileExists",                 "args": ["$SANDBOX/path/to/file.md"] },
    { "fn": "fileMatches",                "args": ["$SANDBOX/x.md", "## 1\\. Overview"] },
    { "fn": "frontmatterHas",             "args": ["$SANDBOX/x.md", ["id", "status"]] },
    { "fn": "frontmatterEquals",          "args": ["$SANDBOX/x.md", { "status": "draft" }] },
    { "fn": "hasAtLeastNSourceCitations", "args": ["$SANDBOX/x.md", 2] },
    { "fn": "trackerPayloadMatches",      "args": ["$SANDBOX/.eval/tracker-payload.json", { "summary": "/cache lib/i" }] },
    { "fn": "answerQueueDrained" }
  ]
}
```

- `$SANDBOX` resolves to the temp dir created for each run.
- Payload-match values support `"/pattern/flags"` for regex matches (e.g. `/cache lib/i`).
- `answerQueueDrained` ensures no scripted answer was left unused — flags missing prompts.

## Adding a scenario

1. Create `scenarios/<name>/scenario.json` with the assertion list.
2. Author `answers.jsonl` (one `{matches, answer}` per line) covering every prompt the skill is expected to ask.
3. For replay mode, drop fixture artefacts under `scenarios/<name>/replay/` mirroring the sandbox layout.
4. Run `node evals/full-flow/runner.mjs scenarios/<name>`. Iterate until 100% pass.
5. Sabotage-verify: mutate one fixture (rename a heading, drop a citation), confirm the corresponding assertion fails, restore.

## Layering recap

| Layer | Tests | What it catches |
| --- | --- | --- |
| L1 unit | `skills/*/tests/*.test.js` | pure helpers (filename regex, id allocator, merge logic) |
| L2 golden | embedded in L1 | template substitution, sprint-status merge against fixtures |
| L3 protocol | `tests/skill-protocol.test.js` | SKILL.md ↔ template ↔ sub-skill drift |
| L4 full-flow | this directory | end-to-end artefact shape |

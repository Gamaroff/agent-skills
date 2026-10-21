---
id: task.213.plan
title: "Implementation Plan: loop-supervisor engine registry and --model flag"
type: plan
task-ref: task.213.loop-supervisor-engine-registry-and-model-flag.md
---

# Implementation Plan: loop-supervisor engine registry and --model flag

> Requirements and success criteria: [task.213.loop-supervisor-engine-registry-and-model-flag.md](task.213.loop-supervisor-engine-registry-and-model-flag.md)

## Overview

Lift the `claude`-specific pieces of `run-loop.mjs` into a table in `references/engines.js`, prove the lift changes nothing for `claude`, then add flags and the `agy` entry on top. The order matters: the `claude` characterisation test is written **before** the refactor, so "no behaviour change" is measured and not asserted.

## Phase-by-Phase Implementation Guide

### Phase 0: Verify `agy`

**Files to modify:** `evals/loop-supervisor/unit/fixtures/agy-result.ndjson` (new).

```bash
agy models                                  # pick the cheapest id for the capture
agy -p "reply with the single word ok" --output-format stream-json \
  --model <cheapest-id> > evals/loop-supervisor/unit/fixtures/agy-result.ndjson
echo "exit=$?"
```

One model call, deliberately tiny. Record in this section, once measured: the result line's exact shape, the `status` values seen, the exit code of a failing run (e.g. a bad `--model`), and whether `--conversation <fresh uuid>` is accepted. For permissions, run one print-mode prompt asking the agent to run `ls` under `--mode accept-edits` with no skip flag, and record whether it prompts, hangs (use `timeout 60`), denies or allows.

**Verified facts (fill in; the task's table is from `agy --help` only):**

Measured 2026-10-21 on `agy` 1.4.2, model `gemini-3.8-flash-low` (captures: `evals/loop-supervisor/unit/fixtures/agy-result.ndjson`, `agy-result-error.ndjson`; the only edit is the `init.cwd` value, replaced with `/tmp/agy-capture`):

- result line shape: `{"event":"result","result":{"conversation_id":"<uuid>","status":"SUCCESS","response":"ok\n","duration_seconds":4.16,"num_turns":1,"usage":{"input_tokens":…,"output_tokens":…,"thinking_tokens":…,"cache_read_tokens":…,"total_tokens":…}}}` — the handoff's description holds. Other lines are `event: "init"` (carries `conversation_id` and `init.model`, `init.permission_mode`) and `event: "step_update"` (`step_type` `user_input` / `agent_response` with `text_delta` / `tool` with `tool_name` and `tool_info`). No cost field anywhere.
- statuses and failure exit code: `SUCCESS` (exit 0); an invalid `--model` gives `status: "ERROR"`, `conversation_id: ""`, an `error` string, and **exit 1**, with the same text on stderr. No other status was observed; any non-`SUCCESS` status is treated as an error (fail closed).
- fresh `--conversation` id: **not pinned.** `--conversation <fresh-uuid>` prints `warning: conversation "<uuid>" not found` on stderr, exits 0, and runs under a *different* new id. The flag is therefore omitted; the id is taken from the stream's `conversation_id`.
- `accept-edits` and a shell command, no skip flag: **allowed, no prompt, no hang.** `--mode accept-edits` in print mode ran `run_command` (`echo agy-probe > probe.txt`) and wrote the file, although `init.permission_mode` reads `request-review`. `agy` has no deny list, so an `agy` loop has no command boundary at all; the operator skip flag is not needed to run a pipeline. Under `--sandbox` the first attempt failed with a sandbox error and the agent re-ran the same command outside it, which succeeded — `--sandbox` is not a hard boundary in print mode and is not emitted by default.

### Phase 1: Registry with `claude` only

**Files to modify:** `skills/loop-supervisor/references/engines.js` (new), `skills/loop-supervisor/scripts/run-loop.mjs`.

First capture the current output as a test fixture:

```bash
command node skills/loop-supervisor/scripts/run-loop.mjs dry-run --adapter generic --command x --json \
  > evals/loop-supervisor/unit/fixtures/dry-run-claude-before.json
```

(Fixtures embed absolute paths; the test compares `argv.slice(1)` and the key set, not the whole file.)

`engines.js` is CommonJS like its siblings (`adapters.js` uses `module.exports`):

```js
const ENGINES = {
  claude: {
    name: "claude",
    binary: "claude",
    // claude 2.1.306 accepts --model and --effort (review 1); skipPermissions stays false
    // on purpose — supervisor-settings.json records why.
    supports: { maxTurns: true, cost: true, pinnedSession: true, settingsFile: true,
                effort: true, skipPermissions: false },
    buildArgs({ prompt, sessionId, settingsPath, maxTurns = null, model = null, effort = null }) {
      const args = [ /* exactly buildClaudeArgs's array today */ ];
      if (model) args.push("--model", model);
      if (effort) args.push("--effort", effort);
      if (maxTurns != null && Number.isFinite(maxTurns)) args.push("--max-turns", String(maxTurns));
      return args;
    },
    parseResult(obj) {
      if (!obj || obj.type !== "result") return null;
      return { subtype: obj.subtype ?? null, isError: obj.is_error === true,
               numTurns: typeof obj.num_turns === "number" ? obj.num_turns : null,
               costUsd: typeof obj.total_cost_usd === "number" ? obj.total_cost_usd : null };
    },
    transcriptPath: (cwd, sessionId) => /* transcriptPathFor */,
  },
};
```

Argument order: with `model` unset the array must equal today's array exactly. Put `--model` after the existing flags and `--max-turns` where it is now, then pin the order with the characterisation test.

In `run-loop.mjs`: replace the `if (obj.type === "result") envelope = obj;` line with `const r = engine.parseResult(obj); if (r) envelope = r;`, and read `env.costUsd`, `env.numTurns`, `env.subtype`, `env.isError` at the totals, `classify()` and ledger sites. `renderStreamLine` keeps its Claude shape for the `claude` log; the `agy` entry adds its own renderer through the table (`renderLine`), so the human log is not claude-only.

### Phase 2: Flags and config

`parseArgs`: add `--engine`, `--model`, `--effort` cases and `KEY_OF` entries (`engine`, `model`, `effort`). `applyConfig`: `ls.engine`, `ls.model`, `ls.effort`, each gated on `!explicit.has(...)`. Default `engine` is `"claude"` in `DEFAULTS`.

After config is applied and before any spawn:

```js
const engine = ENGINES[opts.engine];
if (!engine) throw new Error(`unknown engine ${JSON.stringify(opts.engine)} (known: ${Object.keys(ENGINES).join(", ")})`);
if (opts.maxTurns != null && !engine.supports.maxTurns) refuse("--max-turns", engine);
if (opts.maxCost  != null && !engine.supports.cost)     refuse("--max-cost", engine);
if (opts.effort && !engine.supports.effort)             refuse("--effort", engine);
if (opts.skipPermissions && !engine.supports.skipPermissions)
  refuse("--dangerously-skip-permissions", engine);
```

`--dangerously-skip-permissions` is a flag only: `applyConfig` reads no key for it.

`status` and `watch` stay ahead of all of this: they must not fail because an engine binary is missing.

### Phase 3: The `agy` entry

Base shape, to be corrected by Phase 0:

```js
agy: {
  name: "agy", binary: "agy",
  supports: { maxTurns: false, cost: false, pinnedSession: false, settingsFile: false,
              effort: true, skipPermissions: true },
  buildArgs({ prompt, model = null, effort = null, skipPermissions = false /* , conversation per Phase 0 */ }) {
    const args = ["-p", prompt, "--output-format", "stream-json", "--mode", "accept-edits"];
    // permissions: task Risk 1 decision — only when the OPERATOR passed --dangerously-skip-permissions.
    if (skipPermissions) args.push("--dangerously-skip-permissions");
    if (model) args.push("--model", model);
    if (effort) args.push("--effort", effort);
    return args;
  },
  parseResult(obj) {
    if (!obj || obj.event !== "result") return null;
    const r = obj.result || {};
    const ok = r.status === "SUCCESS";
    return { subtype: ok ? "success" : `error_${String(r.status ?? "unknown").toLowerCase()}`,
             isError: !ok,
             numTurns: typeof r.num_turns === "number" ? r.num_turns : null, costUsd: null };
  },
  transcriptPath: () => null,
}
```

Note `isError: !ok` is what makes an unknown status fail closed. `classify.js` reads `isError` first (`isChildError`), so it does not need to know `agy`'s subtype strings.

### Phase 4: Tests and docs

Add `evals/loop-supervisor/unit/engines.test.mjs`. A fake engine for the integration test is a small script under `evals/loop-supervisor/unit/fixtures/` that prints the Phase 0 capture and exits, passed through a `PATH` override so `resolveBinary("agy")` finds it. `resolveBinary` shells out to `command -v`, so the override must be on `PATH` for the child shell.

## Key Patterns and References

- `explicit` set and `KEY_OF` in `parseArgs`: presence is tracked, never inferred from a value (the comment in `applyConfig` and the dashboard-token comment both say why).
- `childEnvFor` is the credential boundary. Keep it applied to every engine's child.
- `supervisor-settings.json` is claude-only and is passed only when `engine.supports.settingsFile`.
- Bundling: `references/` here is the skill's own directory, not a `shared/resources` copy, so `npm run bundle` does not touch `engines.js`. Confirm with `npm run bundle:check` anyway.

## Testing Approach

- Characterisation test first (Phase 1), then the table, parsers, precedence and refusals. Assert on returned values.
- Mutation-prove: flip `isError: !ok`, drop a refusal, swap the `--model` position; each must turn a named test red.
- Run `command node --test 'evals/loop-supervisor/unit/*.test.mjs'` alone, then `npm test`. Move the gitignored `.agents/skills` symlink aside before trusting a local green.

---
id: task.143.plan
title: "Implementation Plan: qa-next — uat-status.mjs owns the run state file"
type: plan
task-ref: task.143.qa-next-state-file-owned-by-the-tool.md
---

# Implementation Plan: qa-next — `uat-status.mjs` owns the run state file

> Requirements and success criteria: [task.143.qa-next-state-file-owned-by-the-tool.md](task.143.qa-next-state-file-owned-by-the-tool.md)

## Overview

Add four `--state-*` subcommands and an exported `STATE_FIELDS` schema to `uat-status.mjs`, reusing
`describeRow` / `priorRuns` / `repoPathOf`; then rewrite SKILL.md Steps 0–6 to call them. Fix the env
guard and the Step 4.4 bullet alongside.

## Phase-by-Phase Implementation Guide

### Phase 1: schema and subcommands (`skills/qa-next/scripts/uat-status.mjs`)

**Anchors** (by symbol, not line): `OPTIONS` (the flag allow-list), `parseArgs`, `describeRow`,
`priorRuns`, `cmdItem`, `cmdNext`, `die`, `main`'s dispatch chain.

```js
export const STATE_PHASES = Object.freeze(["selected", "resolved", "executed", "recorded", "committed"]);

// One entry per field. `writer`: "init" (set once by --state-init) or "set" (mutable via
// --state-set). `readers`: the SKILL.md steps that read it — the record a test checks.
export const STATE_FIELDS = Object.freeze({
  item:      { writer: "init", readers: ["0", "resume"] },
  function:  { writer: "init", readers: ["6"] },
  surface:   { writer: "init", readers: ["2"] },
  stories:   { writer: "init", readers: ["4"] },
  uatSpecs:  { writer: "init", readers: ["3"] },
  targeted:  { writer: "init", readers: ["resume"] },
  priorRuns: { writer: "init", readers: ["4", "5", "6"] },
  bug:       { writer: "init", readers: ["4"] },          // pre-run link: reuse decision only
  startedAt: { writer: "init", readers: [] },
  phase:     { writer: "set",  readers: ["resume"] },
  runFile:   { writer: "set",  readers: ["4", "legacy-derive"] },
  filedBug:  { writer: "set",  readers: ["4.4", "6"] },
  lane:      { writer: "set",  readers: ["6"] },
});
```

- `statePath(opts)` → `join(opts.root, opts.val("--state") ?? ".claude/state/qa-next.state.json")`.
- `cmdStateInit(opts)`: resolve with the **same** code path as `cmdItem` / `cmdNext` (factor the
  row-resolution into a helper both call — do not duplicate). Build the init object from the
  `describeRow` payload (`id → item`, `function`, `surface`, `stories: stories.map(s => s.id)`,
  `uatSpecs`, `priorRuns`, `bug`), plus `targeted: opts.has("--item")`, `phase: "selected"`,
  `filedBug: null`, `runFile: null`, `startedAt: new Date().toISOString()`. If a state file exists:
  same `item` → print it (resume), exit 0; different → `die("run-in-progress: …", 5)`. Write with
  `mkdirSync(dirname)` + write-temp-then-rename. Print the payload (`--json` → JSON).
- `cmdStateGet(opts)`: absent → `die("no-state", 6)`. Parse; if `priorRuns` is missing, derive
  `priorRuns(opts, state.item).filter(p => p !== state.runFile)` and add `derived: ["priorRuns"]`.
- `cmdStateSet(opts)`: `--state-set <field> <value>`; field must be in `STATE_FIELDS` with
  `writer: "set"`, else `die` naming the field and whether it is init-only or unknown (exit 2).
  `phase`: value in `STATE_PHASES` and index ≥ current index, else refuse. `filedBug`/`runFile`
  take a string or the literal `null`.
- `cmdStateClear(opts)`: `rmSync(path, { force: true })`.
- Add `--state-init`, `--state-get`, `--state-set`, `--state-clear`, `--state` to `OPTIONS`, and the
  four dispatch lines to `main` **before** `--item`/`--next` (since `--state-init --item` carries both).

### Phase 2: SKILL.md

- § "State file": replace the JSON example with: the path, "owned by `uat-status.mjs` — fields and
  who writes each: `STATE_FIELDS`", and the four commands.
- Step 0: `--state-get --json` → absent: fresh; exit 0 with a different `item` and an id given: HALT
  `run-in-progress` (or let `--state-init` return exit 5 and map that).
- Step 1: `--state-init --item <id> --json` / `--state-init --next --json`; exit 3/4 unchanged.
- Steps 3–5: `--state-set runFile <path>`, `--state-set phase resolved|executed|recorded|committed`,
  `--state-set filedBug <path>`.
- Step 6: read with `--state-get`, print, then `--state-clear` last.
- Grep afterwards: `grep -n "state file" skills/qa-next/SKILL.md` — every hit names a command.

### Phase 3: env guard and Step 4.4

```js
// runPathFor — refuse on the label AND the built name:
if (!env || /[\/\\]|\.\./.test(env) || /^\d{2}$/.test(env) || /-\d{2}$/.test(env))
  die(`--env ${env}: …`);
```

- Test the built name: `runPathFor([], "2026-09-22", "10")` refuses; `"ci10"` accepts (not `"env-10"` — the existing `-NN` label rule refuses it) and
  `seqKey` of the result keeps sequence `01`.
- SKILL.md Step 4.4: `- pass → --set <id> pass --run … ` + "(plus the note flag the table below
  gives for the row's current state)".

## Key Patterns and References

- `describeRow` is the one payload builder (task.141 SC-Q1); `--state-init` must call it.
- `repoPathOf` is the one registry→repo conversion (task.141 BUG-21); `bug` in the state file is
  already repo-relative.
- `seqKey` is the one sort key (task.141 SC-Q2).
- Run the script only from its real path with a real `--root` (bug.16).

## Testing Approach

- `evals/qa-next/unit/uat-status.test.mjs`, flat `test()` style with the existing `corpus()` /
  `run()` / `addRows()` helpers; add every new export to the top-level `await import(TOOL)`
  destructuring.
- Mutation proofs: drop the exit-5 refusal; allow init-only `--state-set`; let `phase` go backward;
  skip the legacy derivation; drop the two-digit env refusal — each must red its named test.

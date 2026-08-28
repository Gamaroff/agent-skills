# `loop-supervisor` — a fresh-context sequential loop runner

## Context

`/loop /develop-next` runs every iteration inside **one** Claude session. Both loop paths — the cron
path (`CronCreate`) and the self-paced path (`ScheduleWakeup`) — re-invoke the *same* conversation,
so each iteration starts on top of the accumulated transcript from all the previous ones. The only
relief is auto-compaction, which summarises rather than clears. On a long unattended run the model is
working roadmap item five through a context mostly consumed by items one through four, and quality
degrades in a way that is **invisible from the outside** — no error, no halt, just worse work.

`/loop` cannot fix this. Clearing context is not something a skill can do to itself; the wakeup lands
in the session that already exists.

The fix is to move the loop **outside** the session: one `claude -p` process per iteration, each
starting empty, run strictly sequentially.

This is safe *specifically because* the develop pipelines are already crash-safe. `/develop-next`
persists `.claude/state/develop-next.state.json` and resumes from its flags; `/develop-batch` does the
same with its own state file; the inner `/develop-*` pipelines carry `.claude/state/develop-pipeline.lock`
with a step cursor. **A process boundary is exactly the boundary they already tolerate.**

What is missing is everything *around* the loop: deciding when to stop, knowing what happened, and
being able to watch it while it runs. That is what this sequence builds.

Intended outcome: an operator can start an eight-hour unattended run from a terminal, watch it from
another, get a phone notification if it halts, and afterwards reopen **any** individual iteration with
`claude --resume <uuid>` to see exactly what the model did.

### Decisions taken with the user

| Decision      | Choice                                                                                              | Why                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Home          | `agent-skills`, vendored to consumers                                                                | Reusable across repos; matches the existing source-of-truth rule            |
| Name          | **`loop-supervisor`**                                                                                 | Descriptive and unambiguous next to the built-in `/loop`                    |
| Genericity    | Any slash command, not just develop pipelines                                                        | Per-command knowledge goes in small adapters, not in the loop               |
| Observability | All four — per-session logs + status JSON, live terminal view, dashboard push, notify-on-halt         | Layers 1–2 are self-sufficient; 3–4 are additive                            |
| Stop policy   | All four — frontier empty, halt/error, budget caps, consecutive no-progress                          | Each catches a different failure mode                                       |
| Concurrency   | Sequential only                                                                                      | `develop-next` holds a single-flight lock per tree; parallelism lives inside `/develop-batch` |
| Delivery      | A sequence of task documents, one per shippable unit                                                  | Same shape as the 51–58 restricted-access sequence                          |

## Scope

**In scope**

- A supervisor CLI that runs an arbitrary slash command in a fresh `claude -p` process, repeatedly,
  sequentially, until a stop condition fires.
- Deterministic outcome classification per iteration (`progress` / `done` / `halt` / `incomplete` /
  `error` / `idle`).
- Per-iteration logs, an append-only run ledger, and a live heartbeat file.
- Terminal status views (`status`, `watch`) and terminal-stop notifications.
- A push hook so a consumer-side dashboard can render the run — **the payload contract only**; the
  dashboard itself is not built here.

**Out of scope**

- **Parallelism.** Two concurrent supervisors in one working tree collide on
  `develop-pipeline.lock`. Parallelism stays *inside* `/develop-batch`, which the supervisor can run
  as its per-iteration command.
- **Replacing `/loop`.** The built-in stays the right tool for short, cheap, in-session polling.
- **Any change to the develop pipelines' own logic.** The supervisor observes; it does not reach in.

## What already exists — reuse, do not reinvent

The supervisor is mostly glue. Nearly everything it needs is already in this repo.

| Need                             | Existing thing                                                                                                                                  | Path                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| "Is there work?" oracle          | `select-next.mjs` — JSON on stdout always; `status` ∈ `selected \| stop \| halt`, plus `stopReason`                                              | `skills/develop-next/scripts/select-next.mjs`                            |
| Iteration run state              | `develop-next.state.json` — written at selection, updated Steps 2–4, **deleted only in Step 5**. Present ⇒ unfinished                             | spec in `skills/develop-next/SKILL.md`                                   |
| Sub-step live progress           | `develop-pipeline.lock` — `{skill, report_path, branch, pr_url, current_step (1–8), started_at}`, updated at every step banner                    | `skills/develop-story/references/develop-pipeline-pause.md`              |
| Halt signal                      | `develop-pipeline.last-halt.json` — the lock plus `halt_reason`/`halted_at` (terminal HALT) or `pause_reason`/`paused_at` (PreCompact), `halt_step` | `shared/resources/develop-pipeline-on-precompact.sh`                     |
| HALT-vs-interrupt classification | `HALT_SIGNATURES` / `INTERRUPT_SIGNATURES` regex sets, already tuned                                                                              | `skills/develop-batch/scripts/schedule.mjs`                              |
| House style for a deterministic CLI | `schedule.mjs` — subcommands, JSON on stdout always, exit 0/1, no deps, pure functions exported for tests                                      | `skills/develop-batch/scripts/schedule.mjs`                              |
| Headless-Claude prior art        | the eval driver: `spawnSync("claude", ["-p", ctx.prompt, "--add-dir", ctx.sandbox], …)`                                                          | `evals/shared/drivers/claude-cli.mjs`                                    |
| Stop-hook semantics              | `develop-pipeline-on-stop.sh` — read its comment block before touching anything that reasons about `current_step`                                | `shared/resources/develop-pipeline-on-stop.sh`                           |

## Architecture

```
┌─ Layer 3  status views ─────────────────────────────────────────────┐
│  run-loop.mjs status  ·  run-loop.mjs watch  ·  dashboard push      │
└──────────────────────────── reads ──────────────────────────────────┘
┌─ Layer 2  artifacts (.claude/state/loop-supervisor/) ───────────────┐
│  current.json (heartbeat) · runs.jsonl (ledger) · logs/<runId>/     │
└──────────────────────────── written by ─────────────────────────────┘
┌─ Layer 1  run-loop.mjs — the supervisor process ────────────────────┐
│  probe → spawn claude -p → watch → classify → record → decide       │
└─────────────────────────────────────────────────────────────────────┘
```

**The supervisor is a host process, not something Claude invokes.** It is launched from a terminal and
spawns Claude; never the reverse. The `SKILL.md` exists so a conversational request ("keep working the
roadmap overnight with fresh context") resolves to the right command — the same dual-use shape
`select-next.mjs` already has, where a skill invokes it via Bash and operators also run it directly.

Layers 1–2 are self-sufficient. Layer 3 can land later, or never.

### Per-iteration algorithm

1. **Probe — cheap, no model call.** Run the adapter's probe. Branch on `.status`, **never on exit
   code alone** — `selected` and every `stop` both exit 0; only `halt` exits 1.
   - `selected` → spawn
   - `stop` → end the loop cleanly, report `stopReason`
   - `halt` → end the loop, surface `lint.errors`
   - **Skip the probe entirely when the run-state file exists** — an unfinished run must be resumed,
     not re-selected.

   This is the single biggest efficiency win in the design: never spend a full model invocation to
   discover there is nothing to do.

2. **Spawn.**
   ```
   claude -p "<command>" \
     --output-format stream-json --verbose --include-partial-messages \
     --session-id <uuid-v4> \
     --permission-mode acceptEdits \
     --settings <assets/supervisor-settings.json>
   ```
   cwd = repo root. stdout is tee'd: raw to `logs/<runId>/iter-NNN.jsonl`, and parsed line-by-line to
   drive the heartbeat and a rendered `.txt`.

3. **Watch.** While the child runs, poll `develop-pipeline.lock` every ~5s for `current_step`,
   `branch`, `pr_url`; write `current.json`. This is the only source of *sub-step* granularity — a
   run-state file's booleans cannot express "QA cycle 3 of 5".

4. **Classify** on child exit (table below).

5. **Record.** Append to `runs.jsonl`, update `current.json`, push to the dashboard if configured,
   notify if the outcome is terminal.

6. **Decide.** Apply the stop policy; otherwise cooldown (`--cooldown`, default 10s) and loop.

### Outcome classification — post-conditions, never prose

**The most important rule in this design: never grep the assistant's final message to decide what
happened.** `/develop-next` signals its stop conditions only as prose in its last message — there is no
exit code, no run-report file, no stop-marker. The filesystem is the truth. This is the repo's "No
Model Calls for Deterministic Decisions" principle applied to the supervisor's own control flow, and it
is why the classifier is a separate pure module with its own tests.

| Outcome      | Detected by                                                                                                                       | Loop action                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `progress`   | run-state file absent **and** the adapter's progress oracle fired (for `develop-next`: a new `docs(roadmap): tick` commit on base) | continue; reset idle counter                   |
| `done`       | probe returned `stop` before spawning                                                                                             | stop, clean                                    |
| `halt`       | halt file present with `halted_at`/`paused_at` **newer than this iteration's start**                                              | stop (or continue under `--on-error continue`) |
| `incomplete` | run-state file still present, or the pipeline lock left behind                                                                    | continue if resume attempts remain, else `halt` |
| `error`      | non-zero exit, `is_error`, or `subtype` ∈ `error_max_turns` / `error_during_execution`                                            | stop                                           |
| `idle`       | exited clean, no progress oracle fired                                                                                            | continue until `--max-idle`                    |

Two traps shape this table. Both were confirmed against a live repo:

- **The halt file is never deleted by a successful run**, and it is overwritten on each halt. A live
  example in the consumer repo carries `pause_reason: "precompact"`, `halt_step: 7` from a *previous*
  session. Its existence proves nothing — **the timestamp comparison against iteration start is
  load-bearing.** A stale halt file must classify as `progress`, not `halt`.
- **The `Stop` hook fights process exit.** `develop-pipeline-on-stop.sh` returns `decision: "block"`
  when the lock sits at `1 ≤ current_step ≤ 8`, forcing one continuation; Claude Code's
  `stop_hook_active` flag then caps it to a single block per stop attempt. So a stalled iteration exits
  *leaving the lock behind*. That is why `incomplete` is a first-class outcome with a bounded resume
  budget (`--max-resume-attempts`, default 2 consecutive on the same item) rather than an error —
  mirroring the `attempts` / `interrupted` accounting in `schedule.mjs`.

### Stop policy

All four, each independently configurable; first to trigger wins.

- **Frontier empty** — probe returns `stop`. Costs nothing.
- **Halt or error** — `--on-error stop|continue|retry-once` (default `stop`).
- **Budget caps** — `--max-iterations N`, `--max-cost <USD>` (cumulative `total_cost_usd` from the
  result envelopes), `--max-duration 8h` / `--until 07:00`.
- **Consecutive no-progress** — `--max-idle K` (default 2). Catches silent spinning where every
  iteration exits 0 but nothing lands.

**Signals.** First `SIGINT` = stop after the current iteration completes — never mid-merge. Second =
kill the child and exit, leaving state for the next resume. A PID lock at
`.claude/state/loop-supervisor.lock` enforces single-flight per working tree.

### Adapters

Per-command knowledge lives in a small table (`references/adapters.js`), not in the loop:

```js
{
  probe:          (cwd) => ({ status, reason, itemId }) | null,   // null = always spawn
  progressOracle: (cwd, sinceIso) => boolean,
  stateFile:      ".claude/state/develop-next.state.json",
  lockFile:       ".claude/state/develop-pipeline.lock",
  haltFile:       ".claude/state/develop-pipeline.last-halt.json",
}
```

Ship three: **`develop-next`** (`select-next.mjs` probe, tick-commit oracle) · **`develop-batch`**
(`select-next.mjs --batch` probe, reads `develop-batch.state.json`; iterations stay sequential) ·
**`generic`** (no probe, progress = any new commit, stop only on budget/error).

A *consumer's* custom command is configured **declaratively** in `skills-config.yaml` (probe command +
expected JSON path + progress oracle command), not as user-supplied JS.

### Artifacts

Under `.claude/state/loop-supervisor/`, following the repo's state convention (`schemaVersion` present,
derived values never persisted):

- **`current.json`** — heartbeat, rewritten ~5s, removed on clean exit. Carries `runId`, `pid`,
  `iteration`, `phase`, `pipelineStep`, `itemId`, `branch`, `prUrl`, `sessionId`, `logPath`, `totals`.
- **`runs.jsonl`** — append-only, one line per finished iteration: outcome, reason, exit code,
  `subtype`, duration, cost, turn count, `sessionId`, `logPath`, `transcriptPath`.
- **`logs/<runId>/iter-NNN.jsonl`** — raw `stream-json`, full fidelity.
- **`logs/<runId>/iter-NNN.txt`** — rendered: assistant text plus tool-call names only. The one a
  human actually reads.
- **`logs/latest`** → symlink to the current `runId`.

## Verified environment facts

Measured against `claude` v2.1.250 on macOS. **Re-verify before relying on any of it** — flags move.

- `--output-format json` returns a result envelope carrying `session_id`, `subtype`, `is_error`,
  `num_turns`, `duration_ms`, `total_cost_usd`, `permission_denials`. The `subtype` values `success`,
  `error_max_turns` and `error_during_execution` are all present in the binary.
- `--output-format stream-json` **requires `--verbose`**.
- `--session-id <uuid>` pins the session id. Transcripts live at
  `~/.claude/projects/<cwd-slug>/<session-id>.jsonl`, so pinning it makes each iteration's transcript
  path deterministic **and** makes every iteration reopenable with `claude --resume <uuid>` after the
  fact. This is the strongest debugging affordance in the design and belongs in the README.
- Also used: `--max-turns`, `--permission-mode`, `--settings`, `--add-dir`, `--no-session-persistence`.

## Task sequence

One shippable unit each, in dependency order. 63 and 64 both depend on 62; they are independent of each
other.

| Task | Unit                                   | Delivers                                                                                              |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 62   | The runner (Layers 1–2)                | `run-loop.mjs run\|dry-run`, `classify.js`, `adapters.js`, the artifact set, `SKILL.md`, `README.md`. Usable on its own with logs only |
| 63   | Terminal status views + notifications  | `status`, `watch`, `--notify`, `--webhook`                                                             |
| 64   | Dashboard push + operator documentation | `--dashboard`, the payload contract in the README, the overnight-runs runbook, `develop-next` cross-refs |

## Critical files

**New — `skills/loop-supervisor/`**

| File                              | Purpose                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `SKILL.md`                        | Frontmatter + thin body: when to use, how to launch, how to watch, stop-policy summary          |
| `README.md`                       | Operator guide. Setup, permission mode, PATH caveats, log layout, the `claude --resume` recipe, the honest cost note |
| `scripts/run-loop.mjs`            | The supervisor. `run` \| `status` \| `watch` \| `dry-run`                                       |
| `references/adapters.js`          | Per-command probe / oracle / state-path table                                                   |
| `references/classify.js`          | Pure outcome classifier — the main unit-test surface                                            |
| `assets/supervisor-settings.json` | `--settings` payload pinning permission mode + allowlist, so runs do not inherit local settings drift |

**Modified** — `skills-config.yaml` (a `loopSupervisor:` block), `docs/reference/configuration.md`,
`docs/reference/commands.md`, `docs/runbooks/`, `package.json` (test glob), and
`skills/develop-next/SKILL.md` §Continuous mode + its `README.md` (mention the fresh-context
alternative to `/loop /develop-next`).

## Gotchas the implementation must honour

1. **`select-next.mjs` has a direct-invocation guard** that realpaths both sides (because
   `.claude/skills → ../.agents/skills` is a symlink) — `isInvokedDirectly()` at
   `skills/develop-next/scripts/select-next.mjs:849-860`. Invoked via a path that does not realpath to
   the module, `main()` never runs and it exits **0 with no output** — which a naive probe reads as "no
   work", silently ending the loop. **The probe must treat empty stdout as an error, never as `stop`.**
   This is the highest-consequence bug available in this design, and the module's own comment at `:843-848`
   spells out the failure verbatim: *"exit 0, no output. That reads as 'no item selected' rather than as
   a failure, so the loop silently does nothing."*
2. **`commandArg` from the selector is relative to the roadmap file's directory**, not the repo root.
   Resolve with `path.resolve(path.dirname(roadmapPath), commandArg)`.
3. **`lint.warnings` from the selector is noisy by design and non-fatal.** Only `lint.errors` is.
4. **`node` is not reliably on `PATH`** in non-interactive shells (an nvm shim has been observed
   printing its help text instead of running). Resolve `node` and `claude` absolutely, or launch under
   a login shell.
5. **Not plan mode; `acceptEdits`, not `--dangerously-skip-permissions`.** Plan mode has already killed
   4 of 5 pipelines in a live batch (`skills/develop-batch/SKILL.md`).
6. **Consumer repos may have a `PreToolUse` Bash guard** rejecting `<cmd> | head` / `| tail` (exit-code
   masking). It fires inside every iteration too — supervisor-generated commands must not trip it.
7. **Fresh context costs a re-prime per iteration** — CLAUDE.md, skill files, roadmap. Likely largely
   prompt-cache-served since the prefix is identical across iterations, but it is a real per-iteration
   floor. Say so honestly in the README rather than implying the loop is free.

## Verification

- **Unit** — `classify.js` against fixture `.claude/state/` directories covering every row of the
  outcome table, including both traps: a **stale** halt file (must classify `progress`, not `halt`) and
  a **leftover lock** (must classify `incomplete`, not `error`). Plus the empty-stdout probe case from
  gotcha 1.
- **`dry-run`** — runs the probe, prints the plan and the exact `claude` argv, spawns nothing. Verifies
  adapter wiring against a live repo at zero model spend.
- **End-to-end, cheap** — `generic` adapter, `--command "reply with OK" --max-iterations 2`. Exercises
  spawn → stream-json parse → log write → classify → budget stop for a few cents. Assert: two
  `runs.jsonl` lines, two log pairs, two resumable transcripts, `current.json` removed on exit.
- **End-to-end, real** — one `/develop-next` iteration with `--max-iterations 1` against a roadmap item
  already known selectable. Assert a merged PR, a ticked row, `runs.jsonl` outcome `progress`, and no
  leftover lock.
- **Mutation probe — do this before trusting any green.** Break one post-condition on purpose (delete
  the tick commit; backdate `halted_at`; leave a lock behind) and confirm the classifier's verdict
  flips. A gate that has never reproduced a known failure proves nothing about the gate.

### Repo gates to satisfy before each PR is green

- `quick_validate.py`: `name` hyphen-case matching the directory; `description` non-empty, no `<`/`>`,
  ~100 words, **quoted if it contains `': '`**; every `shared/resources/<file>` reference must resolve.
- `npm run bundle` and `npm run generate-catalog` — run and commit; CI fails on a stale bundle or a
  stale catalog.
- `npm run format:check` (prettier) and `npm test`.
- `tests/executable-instructions.test.js` — **every command the prose tells a reader to run must
  resolve to something that actually ships.** Any `npm run` outside this repo needs an allowlist entry.
- `tests/skill-frontmatter.test.js`, `tests/skill-protocol.test.js`.
- Skill descriptions must not overlap another skill's. Note the collision risk with the built-in
  `/loop`: the description must make the differentiator explicit (fresh process, fresh context,
  sequential, logged) rather than reading as a second general-purpose looper.

## Open questions

**Resolved.**

| Question                                  | Resolution                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Name                                      | `loop-supervisor`                                                                                |
| Where a consumer's custom adapter lives   | Declarative config in `skills-config.yaml`, not user-supplied JS                                 |
| Local SQLite fold of `runs.jsonl`         | No. JSONL is enough for the terminal views; SQLite belongs on the reader side                    |
| `--max-turns` as a per-iteration breaker  | Wire it, unset by default, document it as an option                                              |

**Still open — decide during task 62.**

- What a sane `--max-turns` default would be for a full develop pipeline, if any. Needs one real
  end-to-end run to have an opinion worth writing down.

## Companion work in the consumer repo (spec only — not built here)

`tinker-city` runs a dependency-free stdlib-only `dashboard.py` (`ThreadingHTTPServer`, page constants
in a `pages` dict, `/api/*` if-ladder, `X-Dash-Token` permission tiers, SQLite `history.db`). Adding a
`/loop` page there is roughly: one page constant, one `pages` entry, one nav entry, an `ingest_loop()`
cloned from the existing `ingest_batch()` sanitiser, a `POST /api/loop` (control tier) and
`GET /api/loop` (view tier), plus a `loop_runs` table modelled on the existing `test_runs`.

Two things worth telling whoever builds it:

- **Do not overload the existing `/api/batch`.** Its page hard-codes `/develop-batch` copy, a worktree
  column and a closed step vocabulary, and its payload has no field for iteration index, exit code,
  duration or cost.
- **The existing `/batch` state is in-memory only** and is lost on dashboard restart. That is the wrong
  shape for an eight-hour run; `loop_runs` in SQLite is why the new page needs its own table.

The supervisor's side of the contract — the payload it posts — is documented in task 64 so the two
halves can be built independently:

```json
{ "active": true, "runId": "...", "command": "/develop-next", "startedAt": "...",
  "reporterHost": "...", "repoUrl": "...",
  "current": { "iteration": 7, "phase": "in-pipeline", "pipelineStep": 5,
               "itemId": "T94", "branch": "...", "prUrl": "...", "elapsedSec": 812 },
  "totals": { "iterations": 7, "progressed": 5, "halted": 0, "idle": 2, "costUsd": 12.4 },
  "recent": [ /* last N runs.jsonl records */ ] }
```

## Provenance

Designed in the `tinker-city` consumer repo, 2026-08-28. Every claim about `agent-skills` is verifiable
in this repo; claims about the consumer repo are marked as such. Original handoff:
`handoff.loop-supervisor.md` (session scratchpad, not committed).

# loop-supervisor — operator guide

A host process that runs one **fresh** `claude -p` per loop iteration and classifies each outcome from
files on disk. Launch it from a terminal; it spawns Claude, never the reverse.

Start with [`SKILL.md`](SKILL.md) for what it is and why it differs from the built-in `/loop`. This file
is the operational detail.

## Setup

Requirements: Node ≥ 22, the `claude` CLI on the machine, and a git repo. No npm dependencies.

```bash
node .agents/skills/loop-supervisor/scripts/run-loop.mjs dry-run --adapter develop-next
```

Run that first, every time, in a repo you have not used it in before. It probes, prints the plan and
the **exact** `claude` argv, and spawns nothing. If the argv looks wrong for your `claude` version,
that is the moment to find out — flags move between versions, and printing them is how drift becomes
visible instead of becoming an empty log file at 4am.

### PATH — read this before scheduling an unattended run

`node` is **not reliably on `PATH` in a non-interactive shell.** On the machine this skill was written
on, `command -v node` returns the bare word `node` — it is an nvm shell function, not a binary — and
`node --version` prints nvm's entire help text to stdout *before* the version string. A supervisor that
inherited that would spawn something that prints usage text and exits, for every iteration, all night.

The supervisor therefore resolves both binaries absolutely before it starts (`process.execPath` for
node; a `command -v` that must return an absolute path, then a short list of well-known bin
directories, for `claude`). `dry-run` prints what it resolved:

```json
"resolved": {
  "node":   "/Users/you/.nvm/versions/node/v24.13.1/bin/node",
  "claude": "/Users/you/.local/bin/claude"
}
```

If resolution fails it refuses to start rather than spawning a shim. Launch from a login shell, or pass
absolute paths.

### Auth

The supervisor spawns `claude` with whatever credentials the environment provides. Note that
**`ANTHROPIC_API_KEY` takes precedence over a `claude.ai` login** — if that key belongs to an account
with no credit, every iteration fails with `Credit balance is too low` while the result envelope still
reports `subtype: "success"`. The classifier catches it (`is_error` is checked independently of
`subtype`, for exactly this reason), but you will burn an iteration finding out. `env -u
ANTHROPIC_API_KEY` if you mean to use the login.

## Running

```bash
# The roadmap, until the frontier empties, capped at 8 hours and $20.
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter develop-next --max-duration 8h --max-cost 20

# A single item, to prove the wiring on a real pipeline.
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter develop-next --max-iterations 1

# Any prompt.
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter generic --command "/review-code" --max-iterations 3
```

### Options

| Option                    | Default        | Meaning                                                        |
| ------------------------- | -------------- | -------------------------------------------------------------- |
| `--adapter <name>`        | `develop-next` | `develop-next` \| `develop-batch` \| `generic`                 |
| `--command <prompt>`      | adapter's      | the prompt each iteration runs; **required** for `generic`     |
| `--roadmap <path>`        | adapter's      | passed to the probe                                            |
| `--base <ref>`            | `develop`      | the ref the progress oracle watches                            |
| `--max-iterations <N>`    | unlimited      | budget cap                                                     |
| `--max-cost <USD>`        | unlimited      | cumulative `total_cost_usd` from the result envelopes          |
| `--max-duration <8h\|90m>` | unlimited     | wall clock                                                      |
| `--max-idle <K>`          | `2`            | consecutive no-progress iterations before stopping             |
| `--max-turns <N>`         | unset          | passed to `claude`; `error_max_turns` is a distinguishable subtype so this is cheap to use |
| `--max-resume-attempts <N>` | `2`          | consecutive `incomplete` retries before giving up              |
| `--on-error <stop\|continue>` | `stop`     | what a `halt` or `error` outcome does                          |
| `--cooldown <sec>`        | `10`           | pause between iterations                                       |
| `--config <path>`         | `skills-config.yaml` | where to read the `loopSupervisor:` block               |

Every budget ceiling is checked **before** a spawn, not after. A `--max-cost` that only stops once it
has been exceeded is not a ceiling.

### Configuration

Optional, in the consumer repo's `skills-config.yaml`:

```yaml
loopSupervisor:
  baseBranch: develop
  roadmapPath: docs/development/project-completion-roadmap.md
  cooldownSeconds: 10
  adapters:
    develop-next:
      stateFile: .claude/state/develop-next.state.json
```

Adapter overrides are **declarative only** — paths, never JavaScript. A config file that can name a
module to `require()` is a code-execution surface, and the gain over "probe command plus expected JSON
shape" is nil.

## Stopping it

- **First `Ctrl-C`** — finishes the current iteration, then stops. Never mid-merge: an iteration killed
  between `gh pr merge` and the roadmap tick leaves the repo in exactly the state the tick was meant to
  record.
- **Second `Ctrl-C`** — kills the child and exits, leaving state for the next resume.

A PID lock at `.claude/state/loop-supervisor.lock` enforces one supervisor per working tree. Two would
collide on `develop-pipeline.lock`. If the process died hard, delete the file.

## Reading a run

```
.claude/state/loop-supervisor/
├── current.json                    # heartbeat, ~5s, deleted on clean exit
├── runs.jsonl                      # one line per finished iteration
└── logs/
    ├── latest -> 2026-08-28T…      # symlink to the current run
    └── 2026-08-28T…/
        ├── iter-001.jsonl          # raw stream-json, full fidelity
        └── iter-001.txt            # assistant text + tool-call NAMES only
```

`iter-NNN.txt` is the one to read. It deliberately records tool-call names without their inputs — a
tool input can be an entire file, and this log exists to be skimmed by a human, not to be complete. The
`.jsonl` beside it is complete.

```bash
# Is it alive, and where is it?
cat .claude/state/loop-supervisor/current.json

# What has happened so far?
cat .claude/state/loop-supervisor/runs.jsonl | jq -r \
  '"\(.iteration) \(.outcome) \(.itemId // "-") \(.reason)"'

# Watch the current iteration.
tail -f .claude/state/loop-supervisor/logs/latest/iter-*.txt
```

### Reopening any iteration

This is the strongest debugging affordance here, and it is why `--session-id` is pinned. Every
iteration's transcript survives, and each `runs.jsonl` line carries its `sessionId`:

```bash
claude --resume "$(jq -r 'select(.iteration==3) | .sessionId' \
  .claude/state/loop-supervisor/runs.jsonl)"
```

You get the whole iteration back — every tool call, every file read — in an interactive session, days
later.

## Outcomes, and the two that surprise people

The full table is in [`SKILL.md`](SKILL.md). Two are worth understanding before you read a ledger:

**`incomplete` is not a failure.** `develop-pipeline-on-stop.sh` returns `decision: "block"` when the
pipeline lock sits mid-run, forcing one continuation, and `stop_hook_active` caps that to a single
block. So a stalled iteration exits *cleanly, with the lock still on disk*. That is the system working
as designed. The supervisor resumes, up to `--max-resume-attempts`.

**A halt file proves nothing by its existence.** It is never deleted by a successful run and is
overwritten on each halt, so only its timestamp counts. A halt file older than the iteration that just
ran is leftover state, not a verdict. If you ever see a loop end instantly on iteration 1 citing a halt,
check the timestamp in `.claude/state/develop-pipeline.last-halt.json` before believing it.

## Cost — the honest version

**This loop is not free, and it is not the same cost as `/loop`.** Every iteration re-primes the
context from scratch: `CLAUDE.md`, the skill files, the roadmap. That is the entire point — it is what
buys you an iteration-20 that is as sharp as iteration-1 — but it is a real per-iteration floor.

Much of it should be prompt-cache-served, since the prefix is identical across iterations. A measured
two-iteration `generic` run bore that out: **$0.089 for the first iteration and $0.010 for the second**,
same prompt. Do not extrapolate that ratio to a `/develop-next` iteration, which does far more work
after the prime — but do expect the prime itself to get much cheaper after the first.

Use `--max-cost` on any unattended run. It is checked before each spawn.

## Limits

- **Sequential only.** Parallelism belongs to `/develop-batch`, inside one iteration.
- **No `status` or `watch` subcommand yet**, and no notifications or dashboard push — separate work.
- **Consumer repos may have a `PreToolUse` Bash guard** rejecting `<cmd> | head` / `| tail`. It fires
  inside every iteration too.

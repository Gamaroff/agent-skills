# Runbook — Unattended Overnight Runs

End-to-end walkthrough for leaving `loop-supervisor` working the roadmap while you are asleep, and for
picking up whatever it left in the morning.

## When to use this runbook

Use when you have a **queue of ready roadmap items** and want them worked sequentially over hours,
without a person present. Concretely:

- Several `[ ]` rows in the completion roadmap whose dependencies are already satisfied.
- The work is the ordinary pipeline — `/develop-story`, `/develop-task`, `/develop-bug` — not something
  that needs judgement calls you would want to make yourself.
- You are willing to review a night's output as a batch rather than a PR at a time.

**Use something else if:**

- You want **one** item done now → `/develop-next` on its own.
- You want the frontier done **in parallel** → `/develop-batch` (worktrees, one item per tree).
- The queue is one or two items and you are at the keyboard → `/loop /develop-next` is simpler, and the
  context degradation this tool exists to prevent has no room to bite in two iterations.

### Why not `/loop /develop-next`?

`/loop` re-invokes the **same conversation** every iteration. Item five is therefore worked through a
context mostly consumed by items one to four, and the degradation is invisible from the outside — the
output keeps looking like output. A skill cannot clear its own context, so the loop has to move outside
the session. `loop-supervisor` spawns **one `claude -p` process per iteration**, each with a fresh
context and a pinned session id.

That is not free — see [Cost](#cost-and-what-it-actually-buys-you) — and for a short queue on a machine
you are watching, `/loop` is the right tool. This runbook is for the eight-hour case.

---

## Prerequisites

**1. A roadmap with ready rows.** The supervisor does not decide what to work on; `select-next.mjs`
does, from `docs/development/project-completion-roadmap.md`. Confirm there is something to take:

```bash
node .agents/skills/develop-next/scripts/select-next.mjs \
  --roadmap docs/development/project-completion-roadmap.md
```

A `"status": "selected"` means the loop has work. `stop` or `halt` means it will end on iteration 1 —
fix that before going to bed, not after.

**2. A clean working tree on the base branch.** Each iteration's pipeline halts on a dirty tree, and a
halt at 23:05 wastes the whole night.

```bash
git status --porcelain   # must be empty
git checkout develop && git pull --ff-only origin develop
```

**3. Pipeline hooks installed.** The `Stop` hook is what keeps an orchestrator from yielding mid-pipeline
under context pressure. Without it the run relies on prose-level discipline, which has been observed to
fail.

```bash
bash .agents/skills/develop-task/scripts/install-hooks.sh
```

**4. A permission posture that does not prompt.** Nobody is there to answer. The supervisor passes its
own settings file to each spawned process; if your repo has a `PreToolUse` guard that rejects common
shapes (a Bash guard on `<cmd> | head`, for example), it fires **inside every iteration too**. Test it
with a cheap run before trusting it with a night — see [Rehearse first](#rehearse-first).

**5. `claude` and `node` resolvable from a non-interactive shell.** This bites more people than anything
else on the list. If `node` is an nvm shell function rather than a binary, a naive spawn inherits
something that prints nvm's help text and exits — for every iteration, all night. `run-loop.mjs` resolves
both to absolute paths itself, and `dry-run` prints what it resolved. Check it.

---

## Rehearse first

**It costs cents.** Never let the first run of the night be the first run at all — two rehearsals, in order:

**A. `dry-run` — probes, prints the plan and the exact argv, spawns nothing.**

```bash
node .agents/skills/loop-supervisor/scripts/run-loop.mjs dry-run --adapter develop-next
```

Read three things in the output: `resolved.claude` and `resolved.node` are absolute paths; `probe.status`
is `selected`; and `argv` looks like a command you would be willing to run yourself.

**B. A two-iteration `generic` run — spawns for real, costs cents.**

```bash
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter generic \
  --command 'Reply with the single word: ok' \
  --max-iterations 2 --cooldown 2
```

This proves the whole spawn path — binary resolution, settings, permissions, stream parsing, the ledger
— without touching the repo. If this does not work, the roadmap run will not either.

---

## Starting the run

```bash
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter develop-next \
  --max-duration 8h \
  --max-cost 40 \
  --max-iterations 12 \
  --notify \
  --webhook https://ntfy.sh/your-topic \
  > .claude/state/loop-supervisor/overnight.out 2>&1 &
```

### Choosing the caps

Set **all** of them. They are cheap, they are checked *before* each spawn rather than after, and each
one covers a different way a night goes wrong.

| Cap | What it protects against | A reasonable starting point |
| --- | --- | --- |
| `--max-duration` | The run still going when you need the machine | An hour less than you will be asleep |
| `--max-cost` | Spend running away on work that is not converging | 2–3× your measured cost per item |
| `--max-iterations` | A misconfigured probe re-selecting forever | The number of ready rows, plus two |
| `--max-idle` (default `2`) | Iterations that spawn, cost money and change nothing | Leave at `2` |
| `--max-resume-attempts` (default `2`) | A pipeline that keeps stalling at the same step | Leave at `2` |

**`--max-cost` is the one people omit and regret.** Cost is cumulative `total_cost_usd` across the run.
Measure one item with a single `/develop-next` first, then set the cap from a real number.

### Getting told when it stops

`--notify` (macOS notification) and `--webhook <url>` (ntfy-shaped POST) fire **once, when the loop
ends** — halt, error, budget cap or clean completion — and say which. They do not fire per iteration: a
notifier that pings twenty times a night is one you have muted by morning.

A run that halts at 02:00 otherwise wastes six hours before anyone finds out.

---

## Watching it, from anywhere

```bash
node .agents/skills/loop-supervisor/scripts/run-loop.mjs status          # one-shot; --json for machines
node .agents/skills/loop-supervisor/scripts/run-loop.mjs watch           # repainted every ~2s
```

Both are **pure readers** — no lock, nothing spawned, nothing written — so they are safe from a second
terminal, over SSH, concurrently, and mid-iteration.

Four states, and two of them are easy to misread:

| State | What it means |
| --- | --- |
| `running` | Normal. |
| `no run in flight` | The normal **post-run** state. Exit 0. Not an error. |
| `CRASHED SUPERVISOR` | Heartbeat present, pid dead. The values shown are the **last recorded**, not live. |
| `HEARTBEAT UNREADABLE` | The file is there but will not parse. State is **unknown** — explicitly not "no run". |

Liveness is a pid probe rather than a timeout, because the heartbeat legitimately pauses between
iterations.

### Publishing to a dashboard

If you have a dashboard, `--dashboard <url>` POSTs a status frame on each iteration boundary:

```bash
export LOOP_SUPERVISOR_DASHBOARD_TOKEN=...
node .agents/skills/loop-supervisor/scripts/run-loop.mjs run \
  --adapter develop-next --dashboard https://dash.internal/api/loop
```

The payload contract lives in
[`skills/loop-supervisor/README.md`](../../skills/loop-supervisor/README.md#publishing-the-run-to-a-dashboard).
Prefer the environment variable over `--dashboard-token`: a token on a command line is visible in `ps`.

A push failure warns once and never affects the run — the observer must never be able to kill the work.

---

## In the morning

### 1. Read the ledger, not the logs

```bash
jq -r '[.iteration, .outcome, .itemId, .reason] | @tsv' \
  .claude/state/loop-supervisor/runs.jsonl
```

One line per finished iteration. This is the whole night in twenty seconds.

### 2. Understand the outcome you are looking at

| Outcome | What it means | What to do |
| --- | --- | --- |
| `progress` | The item moved. A roadmap tick landed on the base branch. | Review the PR as normal. |
| `idle` | Spawned, cost money, changed nothing. | Two in a row ends the run. Check the probe. |
| `incomplete` | The pipeline stalled mid-run with its lock still on disk. **Not a failure.** | The supervisor already retried. See below. |
| `halt` | A pipeline HALT — a review gate, five QA cycles, a merge conflict. | Read the halt file. This one wants you. |
| `error` | The child failed — non-zero exit, spawn failure, `is_error`. | Read `iter-NNN.txt`. |
| `done` | The probe found nothing to do. Clean stop. | Nothing. The queue is empty. |

**`incomplete` surprises everyone.** `develop-pipeline-on-stop.sh` returns `decision: "block"` when the
pipeline lock sits mid-run, forcing one continuation, and `stop_hook_active` caps that to a single
block — so a stalled iteration exits *cleanly, with the lock still on disk*. That is the system working
as designed, and the supervisor resumes it, up to `--max-resume-attempts`.

**A halt file proves nothing by its existence.** It is never deleted by a successful run and is
overwritten on each halt, so **only its timestamp counts**. If a loop ends instantly on iteration 1
citing a halt, check the timestamp before believing it:

```bash
jq -r '.halted_at, .halt_reason, .halt_step' .claude/state/develop-pipeline.last-halt.json
```

A halt file older than the iteration that just ran is leftover state, not a verdict.

### 3. Reopen any iteration you want to understand

This is the strongest debugging affordance here, and the reason `--session-id` is pinned. Every
iteration's transcript survives, and each ledger line carries its `sessionId`:

```bash
claude --resume "$(jq -r 'select(.iteration==3) | .sessionId' \
  .claude/state/loop-supervisor/runs.jsonl)"
```

You get the whole iteration back — every tool call, every file read, the full reasoning — in an
interactive session, days later. Nothing else in this system gives you that.

For a quick read without reopening a session, the rendered log is enough:

```bash
cat .claude/state/loop-supervisor/logs/latest/iter-003.txt
```

`iter-NNN.jsonl` beside it is the raw `stream-json` at full fidelity, for when the rendered version has
dropped something you need.

### 4. Clear a halt before running again

A `halt` outcome means the pipeline stopped for a reason a person has to resolve. Read it, fix it, and
only then start another run. Do **not** delete `develop-pipeline.lock` or the run-state file to make a
halt go away — those files are what make the next run resume correctly rather than re-dispatch work that
is half done.

---

## Cost, and what it actually buys you

**This loop is not free, and it is not the same cost as `/loop`.** Every iteration re-primes the context
from scratch: `CLAUDE.md`, the skill files, the roadmap. That is the entire point — it is what buys an
iteration-20 as sharp as iteration-1 — but it is a real per-iteration floor.

Much of it should be prompt-cache-served, since the prefix is identical across iterations. A measured
two-iteration `generic` run bore that out: **$0.089 for the first iteration and $0.010 for the second**,
same prompt. Do not extrapolate that ratio to a `/develop-next` iteration, which does far more work
after the prime — but do expect the prime itself to get much cheaper after the first.

The honest summary: you are paying a per-iteration floor to buy back quality that `/loop` silently
spends. On a two-item queue that is a bad trade. On a twelve-item overnight queue it is the difference
between twelve reviewable PRs and four good ones followed by eight you have to redo.

Set `--max-cost`.

---

## Verification

After a run, all of these should hold:

```bash
# The supervisor released its lock
test ! -f .claude/state/loop-supervisor.lock && echo "lock released"

# No heartbeat left behind (removed on clean exit)
test ! -f .claude/state/loop-supervisor/current.json && echo "clean exit"

# Every ledger line parses
jq -e . .claude/state/loop-supervisor/runs.jsonl > /dev/null && echo "ledger intact"

# The roadmap ticks match the progress outcomes
git log --oneline develop --grep 'docs(roadmap): tick'
```

If the lock is still present and `status` reports `CRASHED SUPERVISOR`, the process died without
cleaning up. Confirm the pid is gone, then remove `.claude/state/loop-supervisor.lock` by hand.

---

## Related

- [`skills/loop-supervisor/README.md`](../../skills/loop-supervisor/README.md) — every flag, the dashboard payload contract, the outcome table
- [`skills/loop-supervisor/SKILL.md`](../../skills/loop-supervisor/SKILL.md) — how one iteration works, adapters, artifacts
- [`skills/develop-next/SKILL.md`](../../skills/develop-next/SKILL.md) — what each iteration actually runs
- [Task Development](./task-development.md) / [Story Development](./story-development.md) — the pipelines being driven

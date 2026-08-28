---
id: task.63
title: '[Task 63] Make an unattended run watchable from a second terminal, and audible when it stops'
type: task
description: 'Task 62 leaves a supervisor that writes a heartbeat and a ledger but has no way to read them back — answering "what is it doing right now?" means tailing a JSONL file by hand. This adds the two terminal views that make an overnight run supervisable: `status` for a one-shot snapshot and `watch` for a ~2s ANSI repaint, both pure file reads over current.json and runs.jsonl, safe to run at any time including mid-iteration. Plus terminal-stop notification — macOS osascript and an ntfy-shaped webhook for phone push — fired only when the loop actually ends, never per iteration.'
tags: [loop-supervisor, observability, cli, terminal, notifications]
category: infrastructure
status: draft
priority: Medium
risk_level: low
created: 2026-08-28
updated: 2026-08-28
estimated_effort_hours: 6
---

# [Task 63] Make an unattended run watchable from a second terminal, and audible when it stops

**Task File**: [task.63.loop-supervisor-status-views.md](./task.63.loop-supervisor-status-views.md)

**Status**: Draft

**Depends on**: task.62

## Overview

Second of three (62–64). Adds Layer 3's terminal half — `status`, `watch`, and terminal-stop
notification — on top of the artifacts task 62 writes. Independent of task 64; either can land first.

## Motivation

### An unattended run you cannot see is not unattended, it is unobserved

Task 62 delivers a loop that runs for hours and writes an accurate record of what it did. What it does
not deliver is any way to read that record while it is happening. Without this task the honest answer to
"how do I see what it's doing" is *tail a JSONL file and parse it in your head* — which is enough for
the person who wrote it, on the day they wrote it, and for nobody else afterwards.

That matters more than it sounds. The failure mode this whole design exists to catch — silent quality
degradation — is only catchable by a human glancing at progress. A run that has quietly been idling for
four iterations looks identical to a healthy one until someone reads the ledger.

### Why the views are pure readers

`status` and `watch` read `current.json` and `runs.jsonl` and write nothing. That is a deliberate
constraint, not an accident of scope: it makes them safe to run **at any time from anywhere**, including
mid-iteration, from a second terminal, over SSH, or twice concurrently. No lock, no coordination, no way
for the act of looking to disturb the run.

### Why notification is terminal-only

An eight-hour run that halts at 02:00 wastes six hours if nobody learns until morning. But a notifier
that fires per iteration trains its recipient to ignore it within one night. So it fires **only when the
loop actually ends** — halt, error, budget cap or clean completion — and says which.

## Technical Background

Everything this task reads is defined by task 62:

- **`current.json`** — heartbeat, rewritten ~5s, removed on clean exit. Carries `runId`, `pid`,
  `iteration`, `phase`, `pipelineStep`, `itemId`, `branch`, `prUrl`, `sessionId`, `logPath`, `totals`.
- **`runs.jsonl`** — append-only, one line per finished iteration: `outcome`, `reason`, `exitCode`,
  `subtype`, `durationMs`, `costUsd`, `numTurns`, `sessionId`, `logPath`, `transcriptPath`.

Two consequences shape the views:

- **`current.json` absent means no run in flight** — either never started or exited cleanly. It is not
  an error state and must not render as one.
- **A stale `current.json` with a dead `pid` means a crashed supervisor.** `status` should say so rather
  than reporting hours-old data as live. Checking liveness is a `process.kill(pid, 0)` probe.

House style is fixed by `schedule.mjs` and by task 62: dependency-free Node ESM, JSON on stdout when
asked, exit 0/1, pure functions exported for tests. The ANSI repaint uses no library.

## Scope

**In scope**

- `run-loop.mjs status` — one-shot snapshot; human-readable by default, `--json` for machines.
- `run-loop.mjs watch` — ANSI repaint at ~2s of the same content.
- `--notify` — macOS `osascript display notification`.
- `--webhook <url>` — ntfy-shaped POST for phone push.
- Dead-supervisor detection via a `pid` liveness probe.
- README section: "how do I see what it's doing".

**Out of scope**

- Dashboard push (task 64) — a different transport with a different failure policy.
- Any change to what task 62 writes. If a view needs a field the ledger lacks, that is a task 62 change,
  raised rather than worked around.
- A TUI, a server, or anything with a dependency.

## Breaking Changes

None. Two new subcommands and two new flags on a skill that has shipped exactly one release. No existing
behaviour changes.

## Decisions

| Decision                        | Choice                                                     | Rationale                                                                          |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Views write nothing             | Pure readers                                                 | Safe from anywhere, any time, concurrently; looking cannot disturb the run          |
| Repaint interval                | ~2s                                                          | Heartbeat is ~5s, so 2s never renders a frame the operator perceives as frozen      |
| Notification granularity        | Terminal stop only                                           | Per-iteration notification is ignored within one night                              |
| Notification transports         | macOS `osascript` + ntfy-shaped webhook                      | Local and phone, both dependency-free                                               |
| Missing `current.json`          | "no run in flight", exit 0                                   | It is the normal post-run state, not an error                                       |
| Stale `current.json`, dead pid  | Rendered explicitly as a crashed supervisor                  | Reporting hours-old data as live is the one genuinely misleading thing a view can do |

## Implementation Plan

### Phase 1 — the renderer, as a pure function

A pure function from `(currentJson | null, recentRuns[], now)` to display lines. Both subcommands are
thin wrappers over it: `status` prints once, `watch` repaints. This keeps the whole formatting surface
unit-testable without a terminal, and means the two views cannot drift apart.

Cover the three states in Phase 1 tests: run in flight, no run in flight, and stale-with-dead-pid.

### Phase 2 — `status`

One-shot. Human-readable by default; `--json` emits the same data as a machine-readable object, per the
repo convention that a CLI always has a JSON mode.

### Phase 3 — `watch`

Repaint loop over the same renderer. Restore the cursor and leave the terminal usable on `SIGINT`. Do
not clear scrollback — an operator who scrolled up to read something should not lose it to a repaint.

### Phase 4 — notification

Fire once, on terminal stop, with the reason. `osascript` when `--notify` and the platform is darwin;
POST when `--webhook` is set. **A failed notification warns and never affects the run's exit status** —
the run's outcome is what it is regardless of whether anyone was told.

### Phase 5 — docs and gates

README section, `docs/reference/commands.md` rows, format, tests.

## Files Summary

**Modified**

| File                                            | Change                                                    |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `skills/loop-supervisor/scripts/run-loop.mjs`   | `status` and `watch` subcommands; `--notify` / `--webhook` |
| `skills/loop-supervisor/README.md`              | "How do I see what it's doing" section                    |
| `skills/loop-supervisor/SKILL.md`               | Watch/notify mentioned in the body                        |
| `docs/reference/commands.md`                    | New rows                                                  |
| `evals/loop-supervisor/unit/*.test.mjs`         | Renderer tests                                            |

**New** — `skills/loop-supervisor/references/render.js` if the renderer is large enough to warrant its
own module; otherwise it stays an export of `run-loop.mjs`. Decide during Phase 1, do not pre-commit.

## Testing Strategy

- **Unit.** The renderer against fixture `current.json` / `runs.jsonl` pairs: run in flight, no run in
  flight, stale-with-dead-pid, a ledger with mixed outcomes, and an empty ledger. Assert content, not
  exact spacing — a formatting test that breaks on a space is a test that gets deleted.
- **Manual, alongside a real run.** Start the cheap end-to-end run from task 62 in one terminal, `watch`
  in another. Confirm the display advances and that `current.json` disappearing renders as clean
  completion rather than an error.
- **Notification.** Fire both transports against a terminal stop; then break the webhook URL on purpose
  and confirm the run's exit status is unchanged and a warning is printed.

## Success Criteria

1. `status` renders correctly in all three states, and `--json` emits the same data machine-readably.
2. `watch` repaints at ~2s and restores the terminal on `SIGINT` without clearing scrollback.
3. A stale `current.json` with a dead pid is reported as a crashed supervisor, never as live data.
4. No run in flight exits 0 with a plain statement, not an error.
5. Notification fires exactly once per run, on terminal stop, naming the reason.
6. A failed notification warns and leaves the run's exit status unchanged.
7. Both views run safely mid-iteration and concurrently, and write nothing.
8. `npm test` and `npm run format:check` green.

## Risk Assessment

| Risk                                                       | Likelihood | Impact | Mitigation                                                            |
| ----------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------- |
| Stale heartbeat rendered as live, misleading the operator   | Medium     | Medium | `pid` liveness probe; explicit crashed-supervisor state, unit-tested   |
| Formatting tests break on whitespace and get deleted        | High       | Low    | Assert content, not layout                                            |
| `watch` clears scrollback an operator was reading           | Medium     | Low    | Repaint in place; never clear history                                 |
| Notification failure aborts an otherwise fine run           | Low        | Medium | Warn-and-continue, asserted by a deliberate-breakage test             |
| Renderer needs a field the ledger lacks                     | Medium     | Low    | Treated as a task 62 change, raised rather than worked around         |

## Rollback Plan

Remove the two subcommands and the two flags. Task 62's runner is unaffected — it neither reads nor
depends on anything this task adds. The artifacts remain readable by hand.

## Progress Tracking

- [ ] 1. Pure renderer + its three-state tests
- [ ] 2. `status` (+ `--json`)
- [ ] 3. `watch`
- [ ] 4. `--notify` / `--webhook`, warn-and-continue on failure
- [ ] 5. README, command rows, format, suite

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-28 | 1.0     | Initial draft | create-task |

## References

- [`.agents/plans/loop-supervisor.md`](../../../.agents/plans/loop-supervisor.md) — the design of record, §Layer 3
- [`docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md`](../task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md) — defines every artifact this task reads
- [`skills/develop-batch/scripts/schedule.mjs`](../../../skills/develop-batch/scripts/schedule.mjs) — CLI house style

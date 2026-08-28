---
id: task.63
title: '[Task 63] Make an unattended run watchable from a second terminal, and audible when it stops'
type: task
description: 'Task 62 leaves a supervisor that writes a heartbeat and a ledger but has no way to read them back — answering "what is it doing right now?" means tailing a JSONL file by hand. This adds the two terminal views that make an overnight run supervisable: `status` for a one-shot snapshot and `watch` for a ~2s ANSI repaint, both pure file reads over current.json and runs.jsonl, safe to run at any time including mid-iteration. Plus terminal-stop notification — macOS osascript and an ntfy-shaped webhook for phone push — fired only when the loop actually ends, never per iteration.'
tags: [loop-supervisor, observability, cli, terminal, notifications]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-08-28
updated: 2026-08-28
estimated_effort_hours: 6
---

# [Task 63] Make an unattended run watchable from a second terminal, and audible when it stops

**Task File**: [task.63.loop-supervisor-status-views.md](./task.63.loop-supervisor-status-views.md)

**Status**: Ready for Review

**Start Date**: 2026-08-28

**Review**: ✅ All review recommendations from `task.63.review.1.loop-supervisor-status-views.md` implemented 2026-08-28

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
  `iteration`, `phase`, `pipelineStep`, `itemId`, `branch`, `prUrl`, `sessionId`, `logPath`, `totals`,
  plus `schemaVersion`, `adapter` and `updatedAt`. `updatedAt` is the "last seen" value to display.
- **`runs.jsonl`** — append-only, one line per finished iteration. **Two row shapes**, keyed on
  `spawned`; a reader must tolerate both:
  - `spawned: true` (`run-loop.mjs:826`) — `outcome`, `reason`, `itemId`, `exitCode`, `subtype`,
    `durationMs`, `costUsd`, **`turns`**, `sessionId`, `logPath`, `rawPath`, `transcriptPath`.
    The field is `turns`, **not** `numTurns` — `num_turns` is the stream-json envelope's name, and the
    ledger renames it on write.
  - `spawned: false` (`run-loop.mjs:711`) — the **probe-stop** row, written whenever the probe returns
    anything but `selected`. It carries only `runId`, `iteration`, `sessionId`, `outcome`, `reason`,
    `probe` and `at`. No `durationMs`, no `costUsd`, no `turns`, no `logPath`. This is the **normal
    last line of a healthy run** (empty frontier), so it is the row most likely to be rendered and the
    easiest to leave untested.

Two consequences shape the views:

- **`current.json` absent means no run in flight** — either never started or exited cleanly. It is not
  an error state and must not render as one.
- **A stale `current.json` with a dead `pid` means a crashed supervisor.** `status` should say so rather
  than reporting hours-old data as live. Liveness is a `process.kill(pid, 0)` probe — reuse the already
  exported `isPidAlive(pid)` (`run-loop.mjs:422`) rather than reimplementing it.
- **Liveness is the only reliable staleness signal — do not add a time-based rule.** The heartbeat's
  `setInterval` is cleared when the child exits (`run-loop.mjs:783`), so `current.json` legitimately goes
  untouched across the probe and the `--cooldown` window (10s by default, longer than the 5s heartbeat).
  A "stale if older than N seconds" heuristic would report a healthy loop as crashed between iterations.

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
| Double-SIGINT kill              | Does **not** notify                                          | `process.exit(130)` fires from the signal handler and never reaches the summary write; the operator is at the keyboard anyway |
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

`parseArgs` is a **closed allowlist and will reject both new subcommands until it is edited**: extend the
`["run", "dry-run"]` check at `run-loop.mjs:165`. The `--command is required for the generic adapter`
guard (`run-loop.mjs:260`) is already scoped `&& subcommand === "run"` and needs no change.

### Phase 3 — `watch`

Repaint loop over the same renderer. Restore the cursor and leave the terminal usable on `SIGINT`. Do
not clear scrollback — an operator who scrolled up to read something should not lose it to a repaint.

### Phase 4 — notification

Fire once, on terminal stop, with the reason. `osascript` when `--notify` and the platform is darwin;
POST when `--webhook` is set. **A failed notification warns and never affects the run's exit status** —
the run's outcome is what it is regardless of whether anyone was told.

Register both flags in `KEY_OF` **and** give them switch cases (`run-loop.mjs:176–250`) — the switch ends
in `default: throw new Error("unknown option ...")`, so an unregistered flag dies at parse.

The notifier hangs off the summary write at the end of `main()` (`run-loop.mjs:869`). The double-SIGINT
path calls `process.exit(130)` from inside the signal handler and never reaches it — that path is
deliberately excluded, per the Decisions table.

### Phase 5 — docs and gates

README section, `docs/reference/commands.md` rows, format, tests. Plus **two retractions** — statements
that become false the moment this merges:

- `skills/loop-supervisor/README.md` §Limits — "**No `status` or `watch` subcommand yet**, and no
  notifications or dashboard push" narrows to dashboard push only.
- `skills/loop-supervisor/SKILL.md` §Limits — "**Layers 1–2 only.**" becomes the Layer 3 terminal half,
  dashboard push still outstanding.

README §"Reading a run" currently answers "how do I see what it's doing" with `cat current.json` and a
`jq` one-liner. **Reframe those as the fallback rather than appending a second answer** — one question
should not have two answers in one document.

## Files Summary

**Modified**

| File                                            | Change                                                    |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `skills/loop-supervisor/scripts/run-loop.mjs`   | `status` and `watch` subcommands; `--notify` / `--webhook`; `readCurrent` / `readLedger` / `notifyTerminalStop` exports |
| `skills/loop-supervisor/README.md`              | "How do I see what it's doing" section; §Limits retraction; §Reading a run reframed as fallback |
| `skills/loop-supervisor/SKILL.md`               | Watch/notify in the body; §Limits retraction              |
| `docs/reference/commands.md`                    | New rows                                                  |
| `evals/loop-supervisor/unit/run-loop.test.mjs`  | 12 new tests (subcommands, flags, readers, notifier); one pre-existing test updated — it used `watch` as its example of an *unknown* subcommand |

**New**

| File                                              | Purpose                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `skills/loop-supervisor/references/render.js`     | The pure renderer — 8 exports, no I/O, both views wrap it     |
| `evals/loop-supervisor/unit/render.test.mjs`      | 17 renderer tests                                             |

**Phase 1 decision: extracted.** The renderer earned its own module (~230 lines with the three-state
classifier, both row shapes and the formatting helpers) and `run-loop.mjs` was already 923 lines.
It is **skill-owned**, beside `classify.js` and `adapters.js` — **not** `shared/resources/`. That
directory is a mix: `references/yaml-subset.js` *is* bundled from `shared/resources/`, and anything
bundled is overwritten by `npm run bundle`. It is **CommonJS**, like both its siblings — the repo root
`package.json` is `"type": "commonjs"`, so a `.js` file here is CJS however the `.mjs` that imports it
is written.

## Testing Strategy

- **Unit.** The renderer against `current.json` / `runs.jsonl` pairs: run in flight, no run in flight,
  stale-with-dead-pid, a ledger with mixed outcomes, an empty ledger, and **a ledger whose last row is a
  `spawned: false` probe-stop row** — the normal ending of a healthy run, and the shape most likely to
  render as `undefined`. Assert content, not exact spacing — a formatting test that breaks on a space is
  a test that gets deleted.
  Keep fixtures **inline**, as objects in the test file: all three existing suites
  (`classify`, `adapters`, `run-loop`) touch no files on disk, and the renderer is a pure function
  precisely so it never needs to.
- **Manual, alongside a real run.** Start the cheap end-to-end run from task 62 in one terminal, `watch`
  in another. Confirm the display advances and that `current.json` disappearing renders as clean
  completion rather than an error.
- **Notification.** Fire both transports against a terminal stop; then break the webhook URL on purpose
  and confirm the run's exit status is unchanged and a warning is printed.

## Success Criteria

- [x] 1. `status` renders correctly in all three states, and `--json` emits the same data
      machine-readably — both modes render from one snapshot, so they cannot disagree.
- [x] 2. `watch` repaints at ~2s and restores the terminal on `SIGINT` without clearing scrollback —
      measured: 3 frames in 4.6s, 2 in-place repaints, 0 screen/scrollback clears.
- [x] 3. A stale `current.json` with a dead pid is reported as a crashed supervisor, never as live
      data — pid probe, no time-based rule; mutation-proved (3 tests red when reverted).
- [x] 3b. An **unreadable** `current.json` is reported as such, never as "no run in flight"
      (TASK-63-BUG-1, found in QA cycle 1). Reader distinguishes absent from unparseable; writer is
      atomic. Both halves mutation-proved.
- [x] 4. No run in flight exits 0 with a plain statement, not an error — verified, exit 0.
- [x] 5. Notification fires exactly once per run, on terminal stop other than an operator-forced
      double-SIGINT kill, naming the reason.
- [x] 6. A failed notification warns and leaves the run's exit status unchanged — verified against an
      unreachable webhook; sync and async failure paths both covered.
- [x] 7. Both views run safely mid-iteration and concurrently, and write nothing — verified: no state
      directory created by a read, 3 concurrent reads clean.
- [x] 8. Both `runs.jsonl` row shapes render — a `spawned: false` probe-stop row shows its outcome and
      reason without emitting `undefined` for the fields it does not carry.
- [x] 9. `npm test` and `npm run format:check` green.

## Implementation Record

**Started**: 2026-08-28 · **Completed**: 2026-08-28 · **Run**: 1 (no iterations needed)

### Implementation summary

Five phases in order, no rework. The renderer was extracted (Phase 1's open decision) because it
reached ~230 lines with the three-state classifier, both ledger row shapes and the formatting helpers,
and `run-loop.mjs` was already 923 lines.

### Approach, by phase

**Phase 1 — the renderer.** `skills/loop-supervisor/references/render.js`, CommonJS like its siblings.
Everything ambient is **injected**: `nowMs` and `isAlive` are parameters, not calls. That is what makes
"stale heartbeat, dead pid" testable at all — the alternative is a test that has to arrange a real dead
process. `statusView()` builds the display model; `renderLines()` formats it; `--json` emits the model.
One model behind both modes is what stops the two views drifting.

**Phase 2 — `status`.** Branches in `main()` **before** `resolveAdapter` and `resolveBinary("claude")`.
That placement is load-bearing: a pure reader that dies because the binary it never invokes is off PATH
is not much of a reader, and the second terminal is exactly where PATH differs.

**Phase 3 — `watch`.** Repaints with `\x1b[nA` + `\x1b[0J` — cursor up over its own frame, erase
forward. Never `\x1b[2J`/`\x1b[3J`. Cursor hidden while painting and restored on `SIGINT`, `SIGTERM`
**and** `exit` — a hidden cursor outlives the process that hid it.

**Phase 4 — notification.** `notifyTerminalStop()` takes its platform, spawner, poster and warn sink as
injected `deps`, so both transports are testable with no network and no macOS. Each is wrapped
separately, so one failing does not skip the other, and the async webhook rejection is caught too — an
unhandled rejection would take the process down, which is the exact opposite of warn-and-continue.
Fires once at the summary write.

**Phase 5 — docs.** README gained "How do I see what it's doing" with the three-state table; the
existing `cat`/`jq` recipes were **reframed as the fallback** rather than left as a second answer.
The stale "no `status` or `watch` subcommand yet" bullets in README and SKILL.md were retracted.

### One pre-existing test was changed, deliberately

`run-loop.test.mjs` asserted that `parseArgs(["watch"])` throws "unknown subcommand" — `watch` was its
example of an *unknown* word. Making `watch` real turned that into a false assertion, so the example
was swapped for one that is still unknown (`sprint`) and the reason recorded in a comment. The test's
intent is unchanged; only its fixture moved.

### Verification

- **29 new tests** (17 renderer + 12 CLI), all green; suite for this skill 140/140.
- **Mutation-proved**, five invariants, each reverted in source and confirmed red before restoring:
  `turns`→`numTurns` (1 red), dead pid reported as running (3 red), raw `undefined` instead of `—`
  (2 red), notification rethrows instead of warning (1 red), first-five instead of last-five (1 red).
- **Manual**: `watch` observed over 4.6s — 3 frames at ~2s, 2 in-place repaints, **0** screen or
  scrollback clears, cursor restored on `SIGINT`, no `undefined` in any frame.
- **Deliberate breakage**: an unreachable webhook (`http://127.0.0.1:1`) warns
  "run unaffected" and the process still exits 0.
- **Pure-reader proof**: `status` run against a tree with no `.claude/state/loop-supervisor` neither
  created the directory nor wrote a file; three concurrent reads completed cleanly.
- `npm run format:check` green; `npm run bundle:skill` reports in sync; `npm run generate-catalog`
  produces no diff.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-28
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.63.qa.1.loop-supervisor-status-views.md](./task.63.qa.1.loop-supervisor-status-views.md)
- **Gate File**: [task.63.gate.1.loop-supervisor-status-views.yml](./task.63.gate.1.loop-supervisor-status-views.yml)

### Test Coverage Summary

- **Tests Executed**: 1824 repo-wide (140 for this skill; 30 new)
- **Phases Verified**: 5/5
- **Critical Issues**: 0 HIGH, 1 MEDIUM, 3 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

All nine success criteria met and the suite is green. The diff code review found one medium-severity
correctness defect the criteria do not cover: an unparseable `current.json` is indistinguishable from an
absent one, so a torn heartbeat renders as **"no run in flight"** while the supervisor is still
running — the same failure class this task set out to prevent. See
[task.63.bug.1.corrupt-heartbeat-reads-as-no-run.md](./task.63.bug.1.corrupt-heartbeat-reads-as-no-run.md).

Five invariants were mutation-proved by QA independently: each reverted in source and confirmed red.

## Bug Reports

### In QA Verification

- [TASK-63-BUG-1: A corrupt heartbeat renders as "no run in flight"](./task.63.bug.1.corrupt-heartbeat-reads-as-no-run.md) — ✅ Ready for QA — Severity: MEDIUM (found and fixed in QA cycle 1, 2026-08-28)

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

- [x] 1. Pure renderer + its three-state tests
- [x] 2. `status` (+ `--json`)
- [x] 3. `watch`
- [x] 4. `--notify` / `--webhook`, warn-and-continue on failure
- [x] 5. README, command rows, format, suite

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-28 | 1.0     | Initial draft | create-task |
| 2026-08-28 | 1.1     | Review 8/10 — corrected `runs.jsonl` field `numTurns`→`turns`, documented the second (`spawned: false`) ledger row shape, named the `parseArgs` registration points, scoped the README/SKILL.md Limits retractions, and recorded the double-SIGINT notification decision | review-task |
| 2026-08-28 |         | Status → ready-for-development | review-task |
| 2026-08-28 |         | Implemented — 8 files, 30 tests | develop |
| 2026-08-28 |         | QA gate CONCERNS (90/100) — 1 medium finding: a corrupt heartbeat renders as "no run in flight" | qa-task |
| 2026-08-28 |         | QA findings fixed — TASK-63-BUG-1 closed (reader distinguishes absent from unreadable; writer now atomic), 9 tests added, 1 iteration | qa-fix |

## References

- [`.agents/plans/loop-supervisor.md`](../../../.agents/plans/loop-supervisor.md) — the design of record, §Layer 3
- [`docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md`](../task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md) — defines every artifact this task reads
- [`skills/develop-batch/scripts/schedule.mjs`](../../../skills/develop-batch/scripts/schedule.mjs) — CLI house style

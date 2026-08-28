---
id: task.62
title: '[Task 62] Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem'
type: task
description: '/loop /develop-next re-invokes the same conversation every iteration, so item five is worked through a context mostly consumed by items one to four — and the degradation is invisible from outside. A skill cannot clear its own context; the loop has to move outside the session. This builds loop-supervisor: a dependency-free Node CLI that spawns one claude -p per iteration with a pinned --session-id, probes select-next.mjs before spending a model invocation, and classifies each outcome purely from filesystem post-conditions rather than from the assistant''s prose. Safe because the develop pipelines are already crash-safe — a process boundary is the boundary they already tolerate.'
tags: [loop-supervisor, orchestration, cli, fresh-context, unattended, classifier]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-08-28
updated: 2026-08-28
completed_date: 2026-08-28
pr_number: 276
estimated_effort_hours: 16
---

# [Task 62] Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem

**Task File**: [task.62.loop-supervisor-runner.md](./task.62.loop-supervisor-runner.md)

**Status**: Accepted

**Review**: ✅ Review recommendations from `task.62.review.1.loop-supervisor-runner.md` implemented 2026-08-28 (1 applied, 1 deferred — tracker linkage)

## Overview

First of three (62–64), and the only one that has to exist. Delivers Layers 1–2 of
[`.agents/plans/loop-supervisor.md`](../../../.agents/plans/loop-supervisor.md): the supervisor process
and the artifacts it writes. Usable on its own with nothing but log files — 63 and 64 add views on top
of what this task writes.

Nothing else depends on it landing first except 63 and 64.

## Motivation

### The loop cannot clear its own context

`/loop /develop-next` runs every iteration inside **one** Claude session. Both loop paths — the cron
path (`CronCreate`) and the self-paced path (`ScheduleWakeup`) — re-invoke the *same* conversation, so
each iteration starts on top of the accumulated transcript from all the previous ones. Auto-compaction
summarises rather than clears.

On a long unattended run the model works roadmap item five through a context mostly consumed by items
one through four. The failure is not a crash. It is **quality degradation with no external signal** —
the loop keeps reporting success while the work gets worse.

`/loop` cannot fix this from the inside. The wakeup lands in the session that already exists. Clearing
context is not an operation a skill can perform on itself.

### Why a process boundary is safe here

This would be reckless against a stateful pipeline. It is safe against these ones because they are
**already crash-safe, by design and under test**:

- `/develop-next` persists `.claude/state/develop-next.state.json` and resumes from its flags.
- `/develop-batch` does the same with `develop-batch.state.json`.
- The inner `/develop-*` pipelines carry `.claude/state/develop-pipeline.lock` with a step cursor, and
  a `Stop` hook that re-prompts on a mid-pipeline stop.

A process boundary is exactly the boundary they already tolerate. This task adds no new resumption
machinery; it *uses* what the pipelines already persist.

### Why the classifier cannot read prose

`/develop-next` signals its stop conditions **only as prose in its final assistant message**. There is
no exit code that distinguishes them, no run-report file, no stop-marker. A supervisor that greps that
message is a model call inside a control-flow decision — precisely what this repo's "No Model Calls for
Deterministic Decisions" principle exists to prevent, and it would fail silently the first time the
wording changed.

So the filesystem is the truth, and the classifier is a separate pure module with its own tests. This
is the single most important design constraint in the task.

## Technical Background

### Verified environment facts

Measured against `claude` v2.1.250 on macOS. **Re-verify at implementation time** — flags move.

- `--output-format json` returns a result envelope carrying `session_id`, `subtype`, `is_error`,
  `num_turns`, `duration_ms`, `total_cost_usd`, `permission_denials`. `subtype` values `success`,
  `error_max_turns`, `error_during_execution` are all present in the binary.
- `--output-format stream-json` **requires `--verbose`**. `--include-partial-messages` adds token-level
  streaming.
- `--session-id <uuid>` pins the session id. Transcripts land at
  `~/.claude/projects/<cwd-slug>/<session-id>.jsonl`, so pinning makes each iteration's transcript path
  deterministic **and** every iteration reopenable with `claude --resume <uuid>` afterwards.

### Reuse map — the exact things this builds on

| Need                                | Existing thing                                                                                   | Path                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Work oracle                         | `select-next.mjs` — JSON on stdout always; `status` ∈ `selected \| stop \| halt`, plus `stopReason` | `skills/develop-next/scripts/select-next.mjs`   |
| Unfinished-run signal               | `develop-next.state.json` — deleted only in Step 5, so presence ⇒ unfinished                        | spec in `skills/develop-next/SKILL.md`          |
| Sub-step granularity                | `develop-pipeline.lock` — `current_step` 1–8, `branch`, `pr_url`, updated at every step banner       | `skills/develop-story/references/develop-pipeline-pause.md` |
| Halt signal                         | `develop-pipeline.last-halt.json` — `halted_at`/`paused_at`, `halt_step`                            | `shared/resources/develop-pipeline-on-precompact.sh` |
| CLI house style                     | `schedule.mjs` — subcommands, JSON on stdout always, exit 0/1, no deps, pure exports for tests       | `skills/develop-batch/scripts/schedule.mjs`     |
| Headless-Claude prior art           | `spawnSync("claude", ["-p", ctx.prompt, …])`                                                        | `evals/shared/drivers/claude-cli.mjs`           |
| Attempt/interrupt accounting shape  | `attempts` / `interrupted` fields                                                                    | `skills/develop-batch/scripts/schedule.mjs`     |

`run-loop.mjs` is a peer of `schedule.mjs` and must match its conventions exactly: dependency-free Node
ESM, Node ≥ 22, JSON on stdout, exit 0/1, pure functions exported for unit tests.

## Scope

**In scope**

- `scripts/run-loop.mjs` with `run` (default) and `dry-run` subcommands.
- `references/classify.js` — the pure outcome classifier.
- `references/adapters.js` — three adapters: `develop-next`, `develop-batch`, `generic`.
- `assets/supervisor-settings.json` — the `--settings` payload.
- The full artifact set: `current.json`, `runs.jsonl`, `logs/<runId>/iter-NNN.{jsonl,txt}`,
  `logs/latest`.
- Stop policy, signal handling, single-flight PID lock.
- `SKILL.md` and `README.md`.
- A `loopSupervisor:` block in `skills-config.yaml` plus its row in `docs/reference/configuration.md`.

**Out of scope — deferred to 63/64**

- `status` and `watch` subcommands (63).
- `--notify` / `--webhook` (63).
- `--dashboard` push and the payload contract (64).
- The overnight-runs runbook and `develop-next` cross-references (64).

**Out of scope entirely**

- Parallelism. Two supervisors in one working tree collide on `develop-pipeline.lock`.
- Any change to the develop pipelines' own logic.

## Breaking Changes

None. This is additive: a new skill directory, one new optional config block, one `package.json` test
glob entry. Nothing existing changes behaviour, and `/loop /develop-next` keeps working exactly as it
does today.

## Decisions

| Decision                          | Choice                                                                       | Rationale                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Classifier input                  | Filesystem post-conditions only                                                | Prose has no contract; the state files do                                  |
| Classifier location               | Its own module, `references/classify.js`                                       | It is the whole correctness surface — it needs to be unit-testable in isolation |
| Probe before spawn                | Always, except when the run-state file exists                                  | Never spend a model invocation to learn there is no work; an unfinished run resumes rather than re-selects |
| `incomplete` as an outcome        | First-class, with a bounded resume budget                                      | The `Stop` hook leaves a lock behind on a stalled iteration — that is normal, not an error |
| Permission mode                   | `acceptEdits` via a pinned `--settings` file                                   | Not plan mode (has killed 4 of 5 pipelines in a live batch); not `--dangerously-skip-permissions`; pinned so runs do not inherit local settings drift |
| Consumer adapters                 | Declarative in `skills-config.yaml`                                            | User-supplied JS in a config path is a code-execution surface for no gain  |
| `--max-turns`                     | Wired, unset by default                                                        | `error_max_turns` is a distinguishable subtype so it is cheap; no basis yet for a sane default |

## Implementation Plan

### Phase 1 — the classifier, first and alone

`references/classify.js`, pure, no I/O of its own: takes a snapshot object (state-file presence, lock
presence + `current_step`, halt-file contents, iteration start time, child exit code, result-envelope
`subtype`/`is_error`, progress-oracle boolean) and returns `{ outcome, reason }`.

Write it against the outcome table before anything spawns a process. Both traps are Phase 1 tests, not
afterthoughts:

- A halt file whose `halted_at`/`paused_at` is **older** than iteration start must classify `progress`,
  not `halt`. The file is never deleted by a successful run and is overwritten on each halt, so its
  mere existence proves nothing.
- A leftover lock must classify `incomplete`, not `error`.

### Phase 2 — adapters and the probe

`references/adapters.js` with the three adapters. The probe wrapper is the risky part:

- Branch on `.status`, **never on exit code alone** — `selected` and every `stop` both exit 0; only
  `halt` exits 1.
- **Empty stdout is an error, never `stop`.** `select-next.mjs` has a direct-invocation guard —
  `isInvokedDirectly()` at `skills/develop-next/scripts/select-next.mjs:849-860` — that realpaths both
  sides; invoked through a path that does not realpath to the module, `main()` never runs and it exits 0
  silently. A naive probe reads that as "no work" and ends the loop having done nothing. The module's own
  comment at `:843-848` describes this failure verbatim, so it is a known trap, not a hypothesis.
- **`commandArg` is repo-root-relative and arrives verbatim** — the selector does no path resolution
  (`select-next.mjs:250`, `:620`). Spawn with cwd = repo root; do not resolve it against the roadmap's
  own directory.
- `lint.warnings` is noisy by design and non-fatal; only `lint.errors` is fatal.

### Phase 3 — spawn, tee and heartbeat

Spawn `claude -p` with the argv from the plan. Tee stdout: raw to `iter-NNN.jsonl`, parsed line-by-line
to drive `current.json` and the rendered `iter-NNN.txt` (assistant text plus tool-call names only).
Poll `develop-pipeline.lock` every ~5s for `current_step`/`branch`/`pr_url`.

Resolve `node` and `claude` to absolute paths — `node` is not reliably on `PATH` in non-interactive
shells, and an nvm shim has been observed printing its help text instead of running.

### Phase 4 — the loop, stop policy and signals

Ledger append, cooldown, and the four stop conditions (frontier empty · halt/error · budget caps ·
consecutive no-progress). First `SIGINT` stops after the current iteration completes — never mid-merge;
second kills the child and exits leaving state for the next resume. PID lock at
`.claude/state/loop-supervisor.lock` for single-flight per tree.

### Phase 5 — `dry-run`, docs and gates

`dry-run` runs the probe, prints the plan and the exact `claude` argv, spawns nothing. Then `SKILL.md`,
`README.md`, the config block, `npm run bundle`, `npm run generate-catalog`, and the test glob.

## Files Summary

**New**

| File                                                     | Purpose                                    |
| -------------------------------------------------------- | ------------------------------------------ |
| `skills/loop-supervisor/SKILL.md`                        | Frontmatter + thin body                    |
| `skills/loop-supervisor/README.md`                       | Operator guide                             |
| `skills/loop-supervisor/scripts/run-loop.mjs`            | The supervisor                             |
| `skills/loop-supervisor/references/classify.js`          | Pure outcome classifier                    |
| `skills/loop-supervisor/references/adapters.js`          | Probe / oracle / state-path table          |
| `skills/loop-supervisor/assets/supervisor-settings.json` | Pinned permission mode + allowlist         |
| `evals/loop-supervisor/unit/*.test.mjs`                  | Classifier and probe unit tests            |

**Modified** — `skills-config.yaml`, `docs/reference/configuration.md`,
`docs/reference/commands.md`, `package.json` (test glob),
`docs/reference/skill-catalog.md` (regenerated).

## Testing Strategy

- **Unit (the bulk).** `classify.js` against fixture `.claude/state/` directories covering every row of
  the outcome table, plus the two traps and the empty-stdout probe case.
- **`dry-run` against this repo.** Verifies adapter wiring at zero model spend.
- **End-to-end, cheap.** `generic` adapter, `--command "reply with OK" --max-iterations 2`. Asserts two
  `runs.jsonl` lines, two log pairs, two resumable transcripts, `current.json` removed on exit. A few
  cents.
- **End-to-end, real — operator step, run after this task's PR merges.** One `/develop-next` iteration,
  `--max-iterations 1`, against a roadmap item already known selectable. Asserts a merged PR, a ticked
  row, outcome `progress`, no leftover lock. **This cannot run inside the `develop-task` pipeline that
  implements this task**, because that pipeline was itself dispatched by `/develop-next` and still holds
  both `.claude/state/develop-next.state.json` (that skill's single-flight lock — its Step 0 refuses to
  select a new item while the file exists) and `.claude/state/develop-pipeline.lock` (which the nested
  pipeline's own Step 1 collision check HALTs on). Even with both locks free, a passing run would select,
  develop and merge an unrelated roadmap item as a side effect of testing. Run it by hand on a clean tree
  once this task has landed.
- **Mutation probe — before trusting any green.** Break one post-condition on purpose (delete the tick
  commit; backdate `halted_at`; leave a lock behind) and confirm the classifier's verdict flips. A gate
  that has never reproduced a known failure proves nothing about the gate.

## Success Criteria

1. `run-loop.mjs dry-run --adapter develop-next` prints a plan and the exact argv, and spawns nothing.
2. Every row of the outcome table has a passing unit test, including a stale halt file classifying
   `progress` and a leftover lock classifying `incomplete`.
3. A probe against a path that does not realpath to `select-next.mjs` classifies as an error, and the
   loop stops loudly rather than reporting "no work".
4. The cheap end-to-end run produces two ledger lines and two transcripts that `claude --resume` can
   reopen.
5. **(Operator acceptance, after this task's PR merges — not a gate on the implementing pipeline.)**
   One real `/develop-next` iteration completes with outcome `progress`, a merged PR and no leftover
   lock. Excluded from the implementing run for the collision reasons given under Testing Strategy; do
   not re-add it as an in-pipeline gate.
6. The mutation probe flips the classifier's verdict for all three broken post-conditions.
7. `npm test`, `npm run format:check`, `quick_validate.py`, `npm run bundle` and
   `npm run generate-catalog` are all green and committed.
8. The `SKILL.md` description states the differentiator against the built-in `/loop` explicitly — fresh
   process, fresh context, sequential, logged.

## Risk Assessment

| Risk                                                            | Likelihood | Impact | Mitigation                                                                        |
| --------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------- |
| Probe misreads the direct-invocation guard's silent exit 0       | Medium     | High   | Empty stdout is an error by construction, with a unit test; called out in the README |
| Stale halt file classified as a fresh halt, ending a good run     | Medium     | High   | Timestamp comparison against iteration start; both directions unit-tested          |
| `Stop` hook leaves a lock behind and it reads as `error`          | High       | Medium | `incomplete` is a first-class outcome with a bounded resume budget                 |
| CLI flags move between `claude` versions                          | Medium     | Medium | Facts re-verified at implementation time; `dry-run` prints argv so drift is visible |
| `node`/`claude` not on `PATH` in a non-interactive shell          | Medium     | Medium | Resolve both absolutely; documented in the README                                  |
| Skill description collides with the built-in `/loop`              | Medium     | Low    | Differentiator stated explicitly; `tests/skill-frontmatter.test.js` guards the rest |
| Per-iteration re-prime cost surprises an operator                 | High       | Low    | Stated honestly in the README rather than implying the loop is free                |

## Rollback Plan

Delete `skills/loop-supervisor/` and revert the `skills-config.yaml` block, the doc rows and the test
glob. Nothing else references it; no pipeline behaviour changes; no state file is shared with an
existing skill. A half-finished run leaves only files under `.claude/state/loop-supervisor/`, which are
safe to delete.

## Progress Tracking

- [x] 1. `classify.js` against the full outcome table, both traps included
- [x] 2. `adapters.js` + the probe wrapper, empty-stdout guard first
- [x] 3. Spawn, tee, rendered log, heartbeat
- [x] 4. Loop, stop policy, signals, PID lock
- [x] 5. `dry-run`
- [x] 6. `SKILL.md`, `README.md`, config block, doc rows
- [x] 7. Cheap end-to-end, mutation probe (real end-to-end is a post-merge operator step — see Testing Strategy)
- [x] 8. Bundle, catalog, format, full suite

## Implementation Record

**Started / completed**: 2026-08-28. Branch `feature/task.62.loop-supervisor-runner`.

### What was built

`skills/loop-supervisor/` — a dependency-free Node CLI (ESM script + CommonJS reference modules,
matching `schedule.mjs` / `yaml-subset.js` house style) that spawns one `claude -p` per iteration with
a pinned `--session-id`, probes before spending a model invocation, and classifies each outcome purely
from filesystem post-conditions.

The split that matters: `classify.js` does no I/O and `adapters.js`'s `interpretProbe` takes a captured
result rather than running one, so the two pieces carrying all the correctness — the outcome table and
the empty-stdout guard — are unit-testable without a subprocess. `run-loop.mjs` is the only module that
touches the filesystem or spawns anything.

### Files

**New**

| File                                                     | Lines | Purpose                                             |
| -------------------------------------------------------- | ----- | --------------------------------------------------- |
| `skills/loop-supervisor/SKILL.md`                        | ~120  | Frontmatter + the `/loop` differentiator, outcomes  |
| `skills/loop-supervisor/README.md`                       | ~180  | Operator guide — options, logs, resume, cost        |
| `skills/loop-supervisor/scripts/run-loop.mjs`            | ~560  | The supervisor — probe, spawn, tee, classify, decide |
| `skills/loop-supervisor/references/classify.js`          | ~250  | Pure outcome classifier                             |
| `skills/loop-supervisor/references/adapters.js`          | ~270  | Probe interpreter, oracles, adapter table           |
| `skills/loop-supervisor/references/yaml-subset.js`       | —     | Bundled from `shared/resources/` by `npm run bundle` |
| `skills/loop-supervisor/assets/supervisor-settings.json` | ~40   | Pinned permission mode + allowlist                  |
| `evals/loop-supervisor/unit/classify.test.mjs`           | ~250  | 39 tests — every outcome row, both traps, precedence |
| `evals/loop-supervisor/unit/adapters.test.mjs`           | ~200  | 29 tests — empty-stdout guard, oracles vs real git  |
| `evals/loop-supervisor/unit/run-loop.test.mjs`           | ~200  | 33 tests — argv, budget, binaries, rendering        |

**Modified** — `skills-config.yaml` (`loopSupervisor:` block), `docs/reference/configuration.md`
(example + 4 key rows), `docs/reference/commands.md` (2 rows), `package.json` (test glob),
`docs/reference/skill-catalog.md` (regenerated).

### Success Criteria

| # | Criterion | Result |
| - | --------- | ------ |
| 1 | `dry-run --adapter develop-next` prints a plan and the exact argv, spawns nothing | ✅ Verified against this repo. Resolved `node` → `~/.nvm/…/v24.13.1/bin/node` and `claude` → `~/.local/bin/claude`; probe returned `selected T62`; `resumePending: true` (the outer run's state file was live), so it correctly reported it would resume rather than re-select |
| 2 | Every outcome-table row has a passing unit test, incl. stale halt → `progress` and leftover lock → `incomplete` | ✅ 39 classifier tests. Both traps tested on **both** sides of their boundary, plus the equality edge (a timestamp equal to iteration start is stale, not fresh) |
| 3 | A probe that does not realpath to `select-next.mjs` classifies as error and stops loudly | ✅ Empty stdout is an error by construction; 4 tests, incl. one asserting no route through `interpretProbe` can turn it into `stop`. The diagnostic naming `realpath` survives into the loop's stop reason |
| 4 | Cheap end-to-end produces two ledger lines and two resumable transcripts | ✅ `generic --max-iterations 2 --cooldown 0`. 2 `runs.jsonl` lines, 2 log pairs, both transcripts on disk under `~/.claude/projects/…`, `current.json` and the PID lock both removed, stop reason `--max-iterations 2 reached`, exit 0. $0.0995 total |
| 5 | One real `/develop-next` iteration | ⏭ **Deferred by design** — reworded in review as a post-merge operator step. It cannot run inside this pipeline (see Testing Strategy) |
| 6 | Mutation probe flips the classifier's verdict for broken post-conditions | ✅ Four mutants run, each restored: halt-freshness ignoring the timestamp (6 fail), leftover lock → error (2 fail), error/halt precedence removed (5 fail), empty stdout → `stop` (3 fail). Green again after each restore |
| 7 | `npm test`, `format:check`, `quick_validate.py`, `bundle`, `generate-catalog` green and committed | ⚠️ **Green for this task's additions; the suite is not clean on `develop` either.** All 101 new tests pass (`node --test 'evals/loop-supervisor/unit/*.test.mjs'`, 101/101 — the same glob `package.json` runs). `format:check`, `quick_validate.py`, `npm run bundle` (1 bundled, 1 rewritten) and `npm run generate-catalog` are all green. Full `npm test` reports failures — but a control run of the full suite on a clean `develop` worktree fails too (`§8b move-sprint-issues.sh` at a 30s timeout, and `driver claude-sdk — availability reflects SDK install + API key`). The failing set varies run to run and is entirely 20–30s timeouts in `shared/resources/tests/jira-interception.test.mjs`, which passes 48/48 in isolation and which this branch does not touch. Pre-existing and load-sensitive, not introduced here — see the Issues Log in the implementation report. |
| 8 | `SKILL.md` description states the `/loop` differentiator explicitly | ✅ "fresh Claude process and a fresh context", "the built-in /loop re-invokes the same conversation each time"; SKILL.md opens with a five-row comparison table |

### Two things the build learned that the plan did not know

**The result envelope can report `subtype: "success"` and `is_error: true` at the same time.** Seen on
a live run whose API-key credit was exhausted: `{"subtype":"success","is_error":true,"result":"Credit
balance is too low"}`. A classifier trusting `subtype` alone would have called every such iteration
clean and looped all night reporting progress while nothing ran — precisely the silent-success failure
this design exists to rule out. `isChildError` already checked all three signals independently; the
real envelope is now pinned as a regression test.

Second-order: `ANTHROPIC_API_KEY` takes precedence over a `claude.ai` login, so an unattended run can
fail this way with no obvious cause. Documented in the README's Auth section.

**Gotcha 4 reproduced exactly.** In a non-interactive shell here, `node --version` prints nvm's entire
help text before the version and `command -v node` returns the bare word `node`. Absolute resolution is
load-bearing, not defensive — and the supervisor refuses to start rather than spawning a shim.

### QA Cycle 1 fixes

**LS-1 — config silently overrode an explicit CLI flag whose value equalled the default.**
`run-loop.mjs` inferred "flag not supplied" by comparing the parsed value against `DEFAULTS`, so
`--base develop` was indistinguishable from unset and a config `baseBranch: main` won over it. That
matters because `--base` is the ref the progress oracle watches: pointed at the wrong branch,
`tickCommitOracle` never fires, so every *successful* iteration classifies `idle` and `--max-idle`
ends a healthy loop while reporting no progress — a silent wrong answer, the failure class this
component exists to detect.

Fixed by **tracking** presence rather than inferring it: `parseArgs` now records every named option in
an `explicit` Set, and the merge moved into an exported `applyConfig(opts, config)` that fills in only
what the caller did not name. `applyConfig` treats a missing `explicit` as "nothing supplied", so a
caller that did not build its options through `parseArgs` still gets config defaults.

9 regression tests added, and **mutation-proven**: restoring the original `=== DEFAULTS` comparison
turns 3 of them red, and the suite is green again once reverted. Also verified live — with a config
saying `baseBranch: main`, `--base develop` now yields `develop` while an unnamed base still yields
`main`.

Advisory cleanup also taken: `retry-once` removed from `classify.js`'s `onError` JSDoc type, with a
note that `--max-resume-attempts` already bounds the only retry case that occurs in practice.

Test count: 101 → **110**.

### Deferred

- Success Criterion 5 (one real `/develop-next` iteration) — operator step after this PR merges.
- `status` / `watch` subcommands, `--notify` / `--webhook`, dashboard push — tasks 63 and 64, out of
  scope here by design.


## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-28
**Quality Score**: 96/100
**Gate Decision**: PASS
**QA Cycles**: 2

### QA Reports

- **Cycle 1**: [task.62.qa.1.loop-supervisor-runner.md](./task.62.qa.1.loop-supervisor-runner.md) — CONCERNS (90/100)
- **Cycle 2**: [task.62.qa.2.loop-supervisor-runner.md](./task.62.qa.2.loop-supervisor-runner.md) — PASS (96/100)
- **Gate File**: [task.62.gate.1.loop-supervisor-runner.yml](./task.62.gate.1.loop-supervisor-runner.yml) (updated in place)

### Test Coverage Summary

- **Tests Executed**: 110 (this task's own suite; 110/110 passing)
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 1 found one medium correctness bug (**LS-1**): the config block silently overrode an explicit CLI
flag whose value equalled the built-in default, because presence was inferred from a `DEFAULTS`
comparison rather than tracked. Consequential for `--base`, the ref the progress oracle watches — a
wrong ref makes every healthy iteration classify `idle` and ends the loop at `--max-idle` reporting no
progress.

Cycle 2 verified it fixed **at the mechanism level** rather than symptomatically: presence is now
tracked in an `explicit` Set, so every config-fillable option is covered by the same rule and any option
added later inherits it. Mutation-proven (restoring the old comparison turns 3 of the 9 new tests red)
and confirmed live against a disagreeing config. No new issues and no regressions.

Score is 96 rather than the formula's 100 because SC5 (one real `/develop-next` iteration) is deferred
to a post-merge operator step and therefore has no evidence behind it yet — a documented deferral, not a
defect, but not something to claim as verified.

## Definition of Done - PASSED

**Status:** ACCEPTED

### QA Summary

**QA Reports**: `task.62.qa.1.loop-supervisor-runner.md` (CONCERNS 90/100) → `task.62.qa.2.loop-supervisor-runner.md` (PASS 96/100)
**Gate File**: `task.62.gate.1.loop-supervisor-runner.yml` — ✅ PASS, 96/100, zero open issues
**QA Cycles**: 2

All Definition of Done criteria verified:

- **Success criteria** — 7 of 8 met; SC5 deliberately deferred to a post-merge operator step (it cannot run inside the pipeline that implements it — lock collision, documented in Testing Strategy)
- **CI** — ✅ **SUCCESS** on the exact head `0426f7d1`. The first sample read `PENDING`; acceptance was held until the `test` job finished rather than assumed
- **Tests** — 110/110 unit tests; four mutation probes during development plus one in the QA fix cycle, every mutant flipping the verdict
- **PR** — #276, OPEN and MERGEABLE
- **Security** — ✅ PASS: no secrets, `acceptEdits` rather than skip-permissions, argv-array spawns throughout, config restricted to path strings so it cannot become a code-execution surface, logs record tool names without inputs
- **Compliance** — N/A: no personal data, payments, UI or health data
- **Documentation** — ✅ PASS: SKILL.md, README.md, config reference, commands reference, regenerated catalog, and a `CHANGELOG.md` entry **added during finalisation after the DoD found it missing**

**Carried forward, openly:** SC5 is deferred rather than met and needs an operator run post-merge; the pre-existing `jira-interception` timeout flake is unrelated to this task and warrants its own bug.

**Detailed Verification Log:** see [`task.62.dod.1.loop-supervisor-runner.md`](./task.62.dod.1.loop-supervisor-runner.md) for full evidence and citations.

**Task marked as ACCEPTED on:** 2026-08-28

## Change Log

| Date       | Version | Description   | Author     |
| ---------- | ------- | ------------- | ---------- |
| 2026-08-28 | 1.0     | Initial draft | create-task |
| 2026-08-28 | 1.1     | Review passed (8/10) — reworded SC5 and its Testing Strategy row as a post-merge operator step; it could not run inside the implementing pipeline without colliding on `develop-next.state.json` and `develop-pipeline.lock`. Tracker linkage gap left open (no `github_issue`). | review-task |
| 2026-08-28 |         | Status → ready-for-development | review-task |
| 2026-08-28 |         | Implemented — 11 files, 101 tests | develop |
| 2026-08-28 |         | QA gate CONCERNS (90/100) — 1 medium finding (LS-1, flag/config precedence) | qa-task |
| 2026-08-28 |         | QA findings fixed — LS-1 flag/config precedence, 1 iteration | qa-fix |
| 2026-08-28 |         | QA gate PASS (96/100) — LS-1 verified fixed, 2 cycles | qa-task |
| 2026-08-28 | 1.2     | DoD verified — accepted (PR #276); CHANGELOG entry added to close a docs gap | finalise |

## References

- [`.agents/plans/loop-supervisor.md`](../../../.agents/plans/loop-supervisor.md) — the design of record
- [`skills/develop-next/scripts/select-next.mjs`](../../../skills/develop-next/scripts/select-next.mjs) — the probe, and the direct-invocation guard behind gotcha 1
- [`skills/develop-batch/scripts/schedule.mjs`](../../../skills/develop-batch/scripts/schedule.mjs) — the CLI house style this must match, and the attempt/interrupt accounting shape
- [`shared/resources/develop-pipeline-on-stop.sh`](../../../shared/resources/develop-pipeline-on-stop.sh) — why `incomplete` exists
- [`evals/shared/drivers/claude-cli.mjs`](../../../evals/shared/drivers/claude-cli.mjs) — headless-Claude prior art

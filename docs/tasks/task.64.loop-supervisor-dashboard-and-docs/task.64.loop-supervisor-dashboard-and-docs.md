---
id: task.64
title: '[Task 64] Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable'
type: task
description: 'The last unit of the loop-supervisor sequence, and the one that lets a consumer repo render a run without this repo knowing anything about that consumer. Adds the optional --dashboard push, whose contract is a documented JSON payload rather than an integration — a failed push warns and never aborts a run. Then the narrative layer the first two tasks deliberately deferred: the unattended-overnight-runs runbook, the honest per-iteration re-prime cost note, the claude --resume recipe for reopening any single iteration, and the cross-references from develop-next pointing at the fresh-context alternative to /loop /develop-next.'
tags: [loop-supervisor, dashboard, documentation, runbook, integration-contract]
category: documentation
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-08-28
updated: 2026-08-29
estimated_effort_hours: 6
---

# [Task 64] Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable

**Task File**: [task.64.loop-supervisor-dashboard-and-docs.md](./task.64.loop-supervisor-dashboard-and-docs.md)

**Status**: Ready for Review

**Review**: ✅ All review recommendations from `task.64.review.1.loop-supervisor-dashboard-and-docs.md` implemented 2026-08-29

**Depends on**: task.62

## Overview

Third of three (62–64), and the one that runs last. Two halves that belong together because both are
about somebody *other than the person who started the run*: the HTTP push that lets a consumer-side
dashboard render it, and the operator documentation that lets a second person reproduce it.

Independent of task 63; either can land first.

## Motivation

### The integration has to be a contract, not a coupling

A consumer repo (`tinker-city` is the one driving this) wants a dashboard page showing the live run.
The wrong way to get there is for this repo to know about that dashboard. The right way is to publish a
documented payload and stop — then the two halves can be built independently, by different people, in
either order, and a second consumer with a completely different dashboard is served by the same contract.

So the deliverable here is **the payload and its documentation**, not an integration.

### Why a failed push must never abort a run

The dashboard is an observer. An eight-hour develop run that dies because a status POST timed out has
inverted the relationship between the work and the reporting of it. Push failures warn and continue,
always — and that has to be tested by breaking it deliberately, because it is exactly the kind of
property that is assumed rather than verified.

### The documentation is the deliverable, not the garnish

Tasks 62 and 63 deliberately deferred the narrative layer, the same way task 58 did for the 51–58
sequence. Three things in particular are worthless in a code comment and load-bearing in a runbook:

- **`claude --resume <uuid>` reopens any single iteration.** Pinned session ids are the strongest
  debugging affordance in the whole design, and nobody discovers it by reading `run-loop.mjs`.
- **Fresh context is not free.** Every iteration re-primes CLAUDE.md, the skill files and the roadmap.
  It is likely largely prompt-cache-served because the prefix is identical across iterations, but it is
  a real per-iteration floor. Saying so plainly is the difference between an operator who trusts the
  tool and one who feels misled by it.
- **`/loop /develop-next` still exists and is still right sometimes.** Someone reading `develop-next`
  needs to know the fresh-context alternative exists and when it is worth the extra cost.

## Technical Background

### The payload

Posted to `--dashboard <url>` with `--dashboard-token <tok>`, via `fetch`, on each iteration boundary:

```json
{ "schemaVersion": 1,
  "active": true, "runId": "...", "command": "/develop-next", "startedAt": "...",
  "reporterHost": "...", "repoUrl": "...",
  "current": { "iteration": 7, "phase": "in-pipeline", "pipelineStep": 5,
               "itemId": "T94", "branch": "...", "prUrl": "...", "elapsedSec": 812 },
  "totals": { "iterations": 7, "progressed": 5, "halted": 0, "idle": 2, "costUsd": 12.4 },
  "recent": [ /* last N runs.jsonl records */ ] }
```

Every field is derivable from what task 62 already writes. This task adds no new state.

`schemaVersion` is the **same constant the runner already stamps into `runs.jsonl` and
`current.json`** (`SCHEMA_VERSION` in `run-loop.mjs`), not a second version number invented for this
payload. It is what makes the "versioned with `schemaVersion`" mitigation in Risk Assessment real: a
consumer can version-check the frame against a value it may already have seen in the ledger, and the two
can never disagree because there is only one of them.

### Consumer-side notes (spec only — not built here)

`tinker-city` runs a dependency-free stdlib-only `dashboard.py` (`ThreadingHTTPServer`, page constants
in a `pages` dict, an `/api/*` if-ladder, `X-Dash-Token` permission tiers, SQLite `history.db`). A
`/loop` page there is roughly: one page constant, one `pages` entry, one nav entry, an `ingest_loop()`
cloned from the existing `ingest_batch()` sanitiser, `POST /api/loop` (control tier) and `GET /api/loop`
(view tier), plus a `loop_runs` table modelled on the existing `test_runs`.

Two things the README should tell whoever builds that side:

- **Do not overload the existing `/api/batch`.** Its page hard-codes `/develop-batch` copy, a worktree
  column and a closed step vocabulary, and its payload has no field for iteration index, exit code,
  duration or cost.
- **The existing `/batch` state is in-memory only** and is lost on dashboard restart — the wrong shape
  for an eight-hour run. That is why the new page needs its own table.

## Scope

**In scope**

- `--dashboard <url>` / `--dashboard-token <tok>`, posting the payload above via `fetch`.
- Warn-and-continue on any push failure.
- The payload contract documented in `README.md`, including the two consumer-side warnings.
- `docs/runbooks/` — an "unattended overnight runs" runbook.
- The `claude --resume <uuid>` recipe and the honest per-iteration cost note.
- `skills/develop-next/SKILL.md` §Continuous mode and its `README.md` — cross-reference the
  fresh-context alternative.
- `loopSupervisor:` dashboard defaults in `skills-config.yaml` and its row in
  `docs/reference/configuration.md`.

**Out of scope**

- **The dashboard itself.** It lives in the consumer repo and is not built, stubbed or tested here.
- Authentication schemes beyond a bearer-style token header.
- Retry or queueing of failed pushes. A dropped status frame is replaced by the next one ~5s later.

## Breaking Changes

None. Two new optional flags, plus documentation. The push is inert unless `--dashboard` is passed.

## Decisions

| Decision                        | Choice                                                      | Rationale                                                                |
| ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Integration shape               | Documented payload only                                       | Lets both halves be built independently, and serves a second consumer unchanged |
| Push failure policy             | Warn and continue, always                                     | The observer must never be able to kill the work                          |
| Failed-push retry               | None                                                          | The next frame is ~5s away; a queue would add state for no gain           |
| Auth                            | Single bearer-style token header                              | Matches the consumer's existing `X-Dash-Token` tiers; anything more is speculative |
| Where the runbook lives         | `docs/runbooks/`                                              | Matches the existing operator-documentation location                      |
| Cost honesty                    | Stated plainly in the README                                  | An operator who feels misled stops trusting the whole tool                |

## Implementation Plan

### Phase 1 — the push

Build the payload from `current.json` and the ledger tail; POST on each iteration boundary. Wrap the
whole thing so that **no failure mode escapes** — timeout, DNS failure, non-2xx, malformed response —
each warns once and continues.

### Phase 2 — prove the failure policy

A test that points `--dashboard` at a URL that cannot resolve and asserts the run's exit status and
outcome are unchanged, with a warning printed. This is the one property of this task that actually
matters, so it is proved rather than assumed.

### Phase 3 — the contract in the README

Payload, field semantics, the token header, and the two consumer-side warnings, written for someone who
does not have this repo open. **Delete the "No dashboard push yet" bullet from `## Limits` in the same
pass** — a README that documents the push under a Limits section still saying it does not exist is worse
than one that says neither. The cost note here is the fuller companion to the statement already in
`SKILL.md` §Limits; write it so the two agree rather than as a second independent claim.

### Phase 4 — the runbook

`docs/runbooks/` — starting an overnight run, choosing caps, what each stop reason means, watching from
a second terminal (task 63), what to do with a halt in the morning, the `claude --resume <uuid>` recipe,
and the cost note. **Add its row to the `docs/runbooks/README.md` index table** — an unindexed runbook
is reachable only by someone who already knows its filename, which is precisely not the reader this
runbook is for.

### Phase 5 — cross-references and gates

`develop-next` SKILL.md and README pointers; the `## Limits` deletion in `skills/loop-supervisor/SKILL.md`;
config rows; `npm run bundle`;
`tests/executable-instructions.test.js` — **every command the prose tells a reader to run must resolve
to something that actually ships**, which is the gate most likely to catch a runbook written slightly
ahead of the code.

## Files Summary

**Modified**

| File                                          | Change                                                        |
| --------------------------------------------- | --------------------------------------------------------------- |
| `skills/loop-supervisor/scripts/run-loop.mjs` | `--dashboard` / `--dashboard-token`; warn-and-continue push    |
| `skills/loop-supervisor/README.md`            | Payload contract, consumer warnings, resume recipe, cost note — **and delete the "No dashboard push yet" bullet from `## Limits`** |
| `skills/loop-supervisor/SKILL.md`             | Dashboard mentioned in the body — **and delete the "No dashboard push." bullet from `## Limits`** |
| `docs/runbooks/README.md`                     | Index the new runbook in the runbook table                     |
| `skills/develop-next/SKILL.md`                | §Continuous mode cross-reference                               |
| `skills/develop-next/README.md`               | Same cross-reference                                           |
| `skills-config.yaml`                          | Dashboard defaults in the `loopSupervisor:` block              |
| `docs/reference/configuration.md`             | New rows                                                       |
| `evals/loop-supervisor/unit/*.test.mjs`       | Payload shape + failure-policy tests                           |

**New** — `docs/runbooks/unattended-overnight-runs.md`.

## Testing Strategy

- **Unit.** Payload construction from fixture `current.json` + ledger: field presence, `recent`
  truncation, `active: false` on the final frame.
- **Failure policy, by deliberate breakage.** Unresolvable host, non-2xx, and a timeout — each asserts
  a warning and an unchanged run outcome.
- **`tests/executable-instructions.test.js`.** Every command in the runbook and README must resolve.
- **Link check.** The runbook's links, including the cross-references into `develop-next`.
- **Read-through.** Someone who has not seen the code follows the runbook end to end on the cheap
  `generic` run from task 62. Anything they have to ask about is a documentation defect.

## Success Criteria

1. A run with `--dashboard` posts a payload matching the documented contract on each iteration
   boundary, ending with `active: false`.
2. Unresolvable host, non-2xx and timeout each warn once and leave the run's outcome and exit status
   unchanged — each proved by a test, not by inspection.
3. The README documents the payload well enough for the consumer half to be built without this repo
   open, including both `/api/batch` warnings.
4. The runbook takes an operator from nothing to a completed overnight run, and covers halts, caps,
   stop reasons and morning triage.
5. `claude --resume <uuid>` is documented as the way to reopen any single iteration.
6. The per-iteration re-prime cost is stated plainly, with the prompt-cache caveat, and does not imply
   the loop is free.
7. `develop-next`'s SKILL.md and README point at the fresh-context alternative.
8. `tests/executable-instructions.test.js`, link check, `npm test` and `npm run format:check` green.

## Risk Assessment

| Risk                                                          | Likelihood | Impact | Mitigation                                                             |
| --------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------ |
| A push failure aborts a long run                                | Low        | High   | Warn-and-continue, proved by three deliberate-breakage tests           |
| Contract drifts from what the consumer builds                   | Medium     | Medium | Payload documented in full and versioned with `schemaVersion`          |
| Runbook documents commands that do not ship                     | Medium     | Medium | `tests/executable-instructions.test.js` is exactly this gate           |
| Consumer overloads `/api/batch` and inherits its closed vocabulary | Medium  | Low    | Both warnings written into the README, not left as tribal knowledge    |
| Token logged in a transcript or ledger line                     | Low        | High   | Token never written to `runs.jsonl`, `current.json` or any log; asserted by test |

## Rollback Plan

Remove the two flags and delete the runbook. The push is opt-in and inert without `--dashboard`, so
nothing that exists today changes. The `develop-next` cross-references are two sentences, revertible on
their own.

## Progress Tracking

- [x] 1. Payload construction + push
- [x] 2. Failure policy, proved by deliberate breakage
- [x] 3. Payload contract in the README, with both consumer warnings
- [x] 4. `docs/runbooks/unattended-overnight-runs.md` + its row in the runbooks index
- [x] 5. `develop-next` cross-references, config rows
- [x] 6. Executable-instructions, link check, format, suite

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-28 | 1.0     | Initial draft | create-task |
| 2026-08-29 | 1.1     | Review passed (9/10, READY TO IMPLEMENT) — added `schemaVersion` to the payload spec so the Risk Assessment mitigation it names is real; named the runbooks-index entry and the two `## Limits` deletions the Files Summary had left implicit | review-task |
| 2026-08-29 |         | Status → ready-for-development | review-task |
| 2026-08-29 |         | Implemented all 5 phases: `--dashboard`/`--dashboard-token` with warn-and-continue push, 22 unit tests (3 deliberate-breakage failure-mode tests), README payload contract with both consumer warnings, `docs/runbooks/unattended-overnight-runs.md` + index row, develop-next cross-references, config rows. Status → ready-for-review | develop-task |

## References

- [`.agents/plans/loop-supervisor.md`](../../../.agents/plans/loop-supervisor.md) — the design of record, §Companion work
- [`docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md`](../task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md) — writes every field this payload carries
- [`skills/develop-next/SKILL.md`](../../../skills/develop-next/SKILL.md) — §Continuous mode, where the cross-reference lands

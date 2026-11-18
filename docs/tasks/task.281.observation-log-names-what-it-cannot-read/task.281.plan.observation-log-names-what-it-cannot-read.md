---
id: task.281.plan
title: "Implementation Plan: The observation log names what it cannot read"
type: plan
task-ref: task.281.observation-log-names-what-it-cannot-read.md
---

# Implementation Plan: The observation log names what it cannot read

> Requirements and success criteria: [task.281.observation-log-names-what-it-cannot-read.md](task.281.observation-log-names-what-it-cannot-read.md)

## Overview

Edit the `shared/resources/` sources with the Edit tool; never a bundled copy. `review-cycle.md` is the exception: it is authored in `skills/observe-work/references/` and has no shared source.

## Phase-by-Phase Implementation Guide

### Phase 1

Read `cmdQueue` (`observation-log.js:733`–`:790`) and `cmdScan` (`:669`). Add `invalidStatus` (file names of entries whose `status` is present, non-empty and outside `STATUS_VALUES`) to `queue` beside `statusless`, and to `scan` as a top-level list; keep counting them open. Add a `status-legal` check to `cmdDoctor` (`:1369`) that fails, naming the files, when any entry is invalid. Test first with a fixture log holding `status: resolved`, plus a control log with a legal status and one with no `status:`.

### Phase 2

In `cmdSetStatus` (`:1017`–`:1110`): add a `--repair` flag (set-status only) that lets `--expect-status` name an illegal literal (and refuses a legal one), so `--repair --expect-status resolved --status actioned` repairs an illegal entry. Without `--repair` the `STATUS_VALUES` check on `--expect-status` (`:1032`) stays: an existing test pins its usage error. Require `--expect-status parked` whenever `--status open` is given; every other `open` use exits 2 `usage` with the rule in the message. Update the header comment and the contract.

### Phase 3

Add the fifth decision, "propose a task", to Step 3 of `skills/observe-work/references/review-cycle.md`, and the scoped-review sentence to Step 7. Add the `status-legal` row to the Session Start `doctor` table in `skills/observe-work/SKILL.md`. Update the contract's `queue`/`scan`/`doctor`/`set-status` sections in `shared/resources/observation-log-contract.md`.

### Phase 4

Mutation-prove each with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle:check`, `CI=true command npm test` (on the LAN server with `npm run test:remote`).

## Key Patterns and References

- `observation-log.js:733`–`:790` (`cmdQueue`), `:669` (`cmdScan`), `:1017` (`cmdSetStatus`), `:1369` (`cmdDoctor`).
- Control design: `create-task` § 8 (obs #176).
- Probing the engine: use a workspace outside `/tmp` (the engine refuses an ephemeral anchor), e.g. under `~/.cache`.

## Testing Approach

Node tests over scratch observation logs in `shared/resources/tests/observation-log.test.mjs`; a documentation test in `skills/observe-work/tests/observe-work.test.js`.

---
id: task.201.plan
title: "Implementation Plan: Pipeline up-front answers and speed modes"
type: plan
task-ref: task.201.pipeline-upfront-answers-and-speed-modes.md
---

# Implementation Plan: Pipeline up-front answers and speed modes

> Requirements and success criteria: [task.201.pipeline-upfront-answers-and-speed-modes.md](task.201.pipeline-upfront-answers-and-speed-modes.md)

## Overview

Ship in five independent phases, measurement first. Re-grep every `path:line` before editing: line
numbers are as of `develop` at `7d712757`. Resolve the task's open decisions (waiver approver,
orchestrator access to `fast`, Step 2 content-identity check) before Phase 3.

## Phase-by-Phase Implementation Guide

### Phase 1: Step timestamps

- Add a `Completed (UTC)` column to the Pipeline Progress table in
  `shared/resources/implementation-report-template.md`.
- Each step doc that ticks its row writes `date -u +%Y-%m-%dT%H:%MZ` into it.
- Verify: a dry run produces one timestamp per completed step; resume does not overwrite earlier ones.

### Phase 2: Answer resolution and `--defaults`

- Define the precedence and validation rules once in §0d of
  `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`; prefer a pure, tested resolver
  (`shared/resources/pipeline-answers.js`) that takes `{flags, policy, derived, epic}` and returns
  `{answers, sources, conflicts}`.
- Parse `--base`, `--target`, `--defaults` from the skill arguments in `develop-{story,task}`.
- §0f: add a source per line (`flag` / `policy` / `recommended` / `asked`).
- Persist resolved answers in the run state / lock; §0b resume reads them back before asking.
- `develop-next:126` and `develop-batch:287-289`: replace the prose directive with `--defaults`
  (coordinate with bug.18).
- Verify: the resolver's case table, each case mutation-proved; a guard test that no orchestrator
  directive names a Q1/Q2 branch literal.

### Phase 3: Step 2 reuse

- In `shared/resources/develop-pipeline-step-2-review.md`: before invoking `review-*`, look for a
  co-located review/validate artifact whose recorded document identity matches the current document;
  if found, skip and log `Step 2 reused: <artifact>`.
- Verify: an edited document after review is re-reviewed; an unedited one is not.

### Phase 4: Speed modes and waivers

- `shared/resources/develop-pipeline-lite-mode.md`: add `fast`, the skip vocabulary
  (`review`, `qa-depth`, `review-pr-depth`) and the floor list.
- Read `pipeline.defaultMode` and `pipeline.skippable` from `skills-config.yaml`; refuse a skip
  outside the allow-list.
- QA loop and finalise: a skipped step writes `gate: WAIVED` with `waiver.reason` and
  `waiver.approved_by`; the DoD renders the waiver.
- Verify: guard that a skip never produces `PASS`; no floor step is reachable by any flag.

### Phase 5: `develop-bug` parity and close-out

- Apply the resolver to `develop-bug`'s Q1 (branch model) / Q2 / Q3 in
  `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` (source equivalent).
- Docs: `docs/operations/workflows.md`, `skills-config.yaml` reference; CHANGELOG `[Unreleased]`
  citing task.201.
- `npm run bundle`; full test suite.

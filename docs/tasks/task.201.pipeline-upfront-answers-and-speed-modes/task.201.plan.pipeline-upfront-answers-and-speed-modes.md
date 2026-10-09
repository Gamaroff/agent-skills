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
numbers are as of `develop` at `7d712757`. The three owner decisions are settled (2026-10-09) and
recorded in the task's Important Clarifications: the invoker approves waivers, autonomous runs are
`fast` by policy only, and Step 2 reuse is keyed on `reviewed_blob:`.

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

- `review-task`, `review-story` and `review-bug` write `reviewed_blob: <git hash-object of the
  document>` into their report, taken **after** Step 8.5's fixes and Step 9's status edit, so the
  review's own edits do not invalidate it.
- In `shared/resources/develop-pipeline-step-2-review.md`: before invoking `review-*`, find the newest
  co-located review/validate artifact; if its `reviewed_blob:` equals `git hash-object` of the current
  document, skip and log `Step 2 reused: <artifact>`. An artifact with no `reviewed_blob:` (written
  before this change) is never reused.
- Verify: an edited document after review is re-reviewed; an unedited one is not; a legacy artifact
  without the field is not reused.

### Phase 4: Speed modes and waivers

- `shared/resources/develop-pipeline-lite-mode.md`: add `fast`, the skip vocabulary
  (`review`, `qa-depth`, `review-pr-depth`) and the floor list.
- Read `pipeline.defaultMode` and `pipeline.skippable` from `skills-config.yaml`; refuse a skip
  outside the allow-list. `develop-next` and `develop-batch` take no `--mode` flag: they run `fast`
  only through `pipeline.defaultMode` (owner decision).
- `waiver.approved_by` is the invoking developer (`git config user.name`).
- QA loop and finalise: a skipped step writes `gate: WAIVED` with `waiver.reason` and
  `waiver.approved_by`; the DoD renders the waiver.
- Verify: guard that a skip never produces `PASS`; no floor step is reachable by any flag.

### Phase 5: `develop-bug` parity and close-out

- Apply the resolver to `develop-bug`'s Q1 (branch model) / Q2 / Q3 in
  `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` (source equivalent).
- Docs: `docs/operations/workflows.md`, `skills-config.yaml` reference; CHANGELOG `[Unreleased]`
  citing task.201.
- `npm run bundle`; full test suite.

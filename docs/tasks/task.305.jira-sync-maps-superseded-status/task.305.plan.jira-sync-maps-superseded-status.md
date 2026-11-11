---
id: task.305.plan
title: "Implementation Plan: Jira sync maps the superseded status"
type: plan
task-ref: task.305.jira-sync-maps-superseded-status.md
---

# Implementation Plan: Jira sync maps the superseded status

> Requirements and success criteria: [task.305.jira-sync-maps-superseded-status.md](task.305.jira-sync-maps-superseded-status.md)

## Overview

Add one key and two set entries in `shared/resources/jira-sync.js`, check the GitHub ladder for the same gap, and hold each with a test that goes red without it. Decide option A or B first (task Section 3).

## Phase-by-Phase Implementation Guide

### Phase 1: The Jira map

**Files to modify:**

- `shared/resources/jira-sync.js` — in `DEFAULT_STATUS_MAP` (`:3459`) add `superseded: CANCELLED_CANDIDATES,` beside `cancelled`; add `"superseded",` to `TERMINAL_LOCAL_STATUSES` (`:3505`) and `NEGATIVE_LOCAL_STATUSES` (`:3524`).

**Exact changes:** three one-line additions. Do not add a new candidates list: a second list for the same states is the drift the existing `CANCELLED_CANDIDATES` avoids.

### Phase 2: One definition, four scripts

Grep each `sync-jira-{bug,epic,story,task}` entry point for `DEFAULT_STATUS_MAP` or `mapStatusCandidates`. If one carries its own copy, route it through `jira-sync.js`. Do not touch the bug lifecycle map (bug statuses are a separate set).

### Phase 3: The GitHub path

Read `shared/resources/tracker-workflow.js` lines 398-412 first. If an unknown `documentStatus` key is rejected, add `superseded` to the allowed set; if it is accepted, add `superseded: ...` to the scaffold in `shared/resources/gh-stage.js` (`:1946`, beside `cancelled`) using the same `resolved("done") || last` target. Pick one and test it.

### Phase 4: Bundle and mutation

`npm run bundle`, then `npm run bundle:check`. Mutations to run and record in the QA report: drop the map key, drop each set entry, drop the ladder line. Each must turn a named test red.

## Key Patterns and References

- `mapStatusCandidates` returns `[raw]` for an unmapped key (`jira-sync.js:3857`): that is the failure being fixed.
- The map is overlaid by config at `jira-sync.js:3717`, so option B stays available to a board without a code change.
- PR #878's tests (`evals/develop-next/unit/select-next.test.mjs`, "B8: the code task lifecycle matches document-status-lifecycle.md") are the model for a code-versus-doc check.

## Testing Approach

New file `shared/resources/tests/jira-sync-superseded-status.test.mjs`, in the style of `jira-ready-for-development-candidates.test.mjs`: import from `jira-sync.js`, assert `mapStatusCandidates("superseded")`, `isTerminalLocalStatus("superseded")` and `isNegativeLocalStatus("superseded")`. Add a ladder test for `gh-stage.js`. Remove any temp directory a test creates in a `finally` or `t.after`.

---
id: task.113.plan
title: "Implementation Plan: the orchestrator records what it selected"
type: plan
task-ref: task.113.develop-next-registry-bookkeeping.md
---

# Implementation Plan: the orchestrator records what it selected

> Requirements and success criteria: [task.113.develop-next-registry-bookkeeping.md](task.113.develop-next-registry-bookkeeping.md)

## Overview

Read #46 first: it tells you what task.103 already did. The Step 4 registry branch is additive.

## Phase-by-Phase Implementation Guide

### Phase 1: Step 4
Title → "Record the acceptance". Branch on `item.source`. Task-registry arm calls
`node shared/resources/registry-tick.js --annotate --file <doc> --pr <M> [--issue <ref>] --json`:
the engine locates the row by id (`| N |` at line start — the locator it already has), fills the
7th (`Issue`) cell when it is `—` and `--issue` is given, and appends `· PR #M merged` to the 8th
cell (replacing a lone `—`); it never touches Status (finalise did) or `Next Available`. Reasons:
`annotated | already | no-cell | no-row | no-registry | not-a-task`, all exit 0. Commit
`docs(registry): record <id> — PR #M merged`. Bug-registry arm: the engine answers `not-a-task`
(the bug registry has no Issue/notes cell) — Step 4 logs it and skips the commit. Re-run →
`already`, never "nothing to tick". Column shapes are in the task's §3.

### Phase 2: Step 3
Replace the PASS clause with a three-condition list and a table of (gate, document) → action.

### Phase 3: Step 2
After the linkage check: `if [ -z "$TRACKER_ISSUE_AT_STEP_1" ] && [ -n "$TRACKER_ISSUE" ]; then run 0c-reg; fi`
— state it in prose matching the step doc's style.

## Key Patterns and References
- `shared/resources/registry-tick.js` for the row-locating regex to reuse.
- `docs/contributing/traps.md` "Do not use a next-heading lookahead".

## Testing Approach
Fixture tests for the annotate mode against a scratch registry (append, replace `—`, `already`,
`Issue` fill, bug doc → `not-a-task`, missing row → `no-row`); shape tests with floors for the
Step 4 branch, the Step 3 matrix rows, and the Step 2 re-fire; one mutation per new clause.

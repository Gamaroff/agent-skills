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
Title → "Record the acceptance". Branch on `item.source`. Registry arm: locate the row by id
(`| N |` at line start), set the issue cell if the run created one (read the document's
`github_issue`/`jira_key`), append `· PR #M merged` to notes; do not touch Status (finalise did) or
`Next Available`. Commit `docs(registry): record <id> — PR #M merged`. If the row is already
complete (re-run), say `already`, not "nothing to tick".

### Phase 2: Step 3
Replace the PASS clause with a three-condition list and a table of (gate, document) → action.

### Phase 3: Step 2
After the linkage check: `if [ -z "$TRACKER_ISSUE_AT_STEP_1" ] && [ -n "$TRACKER_ISSUE" ]; then run 0c-reg; fi`
— state it in prose matching the step doc's style.

## Key Patterns and References
- `shared/resources/registry-tick.js` for the row-locating regex to reuse.
- `docs/contributing/traps.md` "Do not use a next-heading lookahead".

## Testing Approach
Shape tests + one scratch-registry fixture run.

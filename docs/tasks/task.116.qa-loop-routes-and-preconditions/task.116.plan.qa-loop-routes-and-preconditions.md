---
id: task.116.plan
title: "Implementation Plan: route on the queue, gate on the evidence"
type: plan
task-ref: task.116.qa-loop-routes-and-preconditions.md
---

# Implementation Plan: route on the queue, gate on the evidence

> Requirements and success criteria: [task.116.qa-loop-routes-and-preconditions.md](task.116.qa-loop-routes-and-preconditions.md)

## Overview
Three files, six observations. Do the router first — it is the smallest edit and the one a replay fixture can prove.

## Phase-by-Phase Implementation Guide
### Phase 1 — router: add route 3 to §5c; rewrite 5b's entry sentence around `top_issues[]` having an `open` entry.
### Phase 2 — preconditions: Step 3b ends with "record the returned findings block"; Step 10 opens with "if 3b was dispatched, its block must be in hand"; Step 13 repeats it.
### Phase 3 — execution: after the diff reviewer returns, "apply `probe-boundary-rule.md`; if it fires, generate and execute candidates; report on the `code_review` finding shape with `probes_executed`". Add the platform-variance paragraph with `TMPDIR=/tmp node --test 'skills/<skill>/tests/*.test.js'`.
### Phase 4 — subagents: a three-row table in autonomous-defaults; pointers from qa-task 3b, review-task 1.5, develop Step 3, qa-fix 1a.

## Key Patterns and References
`qa-task` Step 4b — the existing execution step to sit beside. `zshAvailable()` — inherit environment facts, never hardcode.

## Testing Approach
Replay fixture for the route; parity test between qa-task and qa-story for the new sentences.

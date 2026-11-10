---
id: task.300.plan
title: "Implementation Plan: security-probe names the sink it observes"
type: plan
task-ref: task.300.security-probe-names-the-sink-it-observes.md
---

# Implementation Plan: security-probe names the sink it observes

> Requirements and success criteria: [task.300.security-probe-names-the-sink-it-observes.md](task.300.security-probe-names-the-sink-it-observes.md)

## Overview

Confirm the premise by reading the runner, then add a field and a report line.

## Phase-by-Phase Implementation Guide

### Phase 1: Confirm

Read `skills/finalise/references/security-probe.mjs`, `security-probe-plan.mjs` and `probe-boundary-signals.mjs`. Write three sentences in the QA report: what makes a candidate "reproduced", which sinks exist, and whether a flag-to-remote-shell boundary can be observed.

### Phase 2 to 4

Edit the shared source (never a bundled copy), then `npm run bundle`. Add behaviour fixtures. Mutation-prove.

## Key Patterns and References

- The existing record shape in `docs/tasks/task.295.test-remote-lan-server-route/task.295.dod.1.security.run.json`.

## Testing Approach

Whole suite through `npm run test:remote` after each fix.

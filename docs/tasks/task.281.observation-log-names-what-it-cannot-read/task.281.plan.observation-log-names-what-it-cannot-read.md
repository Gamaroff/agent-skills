---
id: task.281.plan
title: "Implementation Plan: The observation log names what it cannot read"
type: plan
task-ref: task.281.observation-log-names-what-it-cannot-read.md
---

# Implementation Plan: The observation log names what it cannot read

> Requirements and success criteria: [task.281.observation-log-names-what-it-cannot-read.md](task.281.observation-log-names-what-it-cannot-read.md)

## Overview

Edit `shared/resources/` sources with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

Read `observation-log.js:735`–`:790` and the queue builder. Add `invalidStatus` (names of entries whose `status` is present and outside the enum) beside `statusless`; keep counting them open. Add a `doctor` check reporting the count. Test first with a fixture log holding `status: resolved`.

### Phase 2

In `set-status`, when the current value is outside the enum, accept `--expect-status <that literal>`; allow `parked → open`. Keep `actioned → open` refused.

### Phase 3

Add the fifth decision to `review-cycle.md` and the scoped-review sentence to Step 7.

### Phase 4

Mutation-prove each with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `observation-log.js:742`–`:781`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests over scratch observation logs.

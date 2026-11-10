---
id: task.301.plan
title: "Implementation Plan: PreCompact pause comment names the cycle and the pause count"
type: plan
task-ref: task.301.precompact-pause-comment-names-cycle-and-count.md
---

# Implementation Plan: PreCompact pause comment names the cycle and the pause count

> Requirements and success criteria: [task.301.precompact-pause-comment-names-cycle-and-count.md](task.301.precompact-pause-comment-names-cycle-and-count.md)

## Overview

Extend the PR comment body, then add tests that pin three existing behaviours. Edit sources under `shared/resources/` only, then `npm run bundle`.

## Phase-by-Phase Implementation Guide

### Phase 1

In `develop-pipeline-on-precompact.sh`, near the body assembly after line 391, read `qa_cycle` from the lock if present and a `pause_count` kept inside the lock's `paused` record (increment on a repeat at the same step, reset on a new step). The comment is already found by marker and edited in place; only the body text changes.

### Phase 2

Find the existing Step 1 tests by grepping `Start fresh` and `paused` under `shared/resources/tests/` and the `*.test.sh` files, list which of the three cases exist, and add the missing ones.

### Phase 3

A scenario in `develop-pipeline-on-precompact.test.sh` using `precompact-gh-stateful.sh`: pause at step A, then at step B; assert two `pr-N.md` files and two `pr comment` argv lines in `$GH_LOG`. Mutate `next_n` to `echo 0` and confirm red.

## Key Patterns and References

- The stateful fixture's header comment lists the `gh` calls it models.

## Testing Approach

Mutation-prove each test, run `lint:shell`, then the whole suite through `npm run test:remote -- --run ci` from a full clone.

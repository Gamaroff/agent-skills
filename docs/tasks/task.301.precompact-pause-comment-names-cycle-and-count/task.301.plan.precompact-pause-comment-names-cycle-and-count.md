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

In `develop-pipeline-on-precompact.sh` (search for `PR_MARKER=`), derive the QA cycle from the highest `{prefix}.gate.{N}.*` file in the lock's `task_or_story_directory` when `current_step` is 5; the lock has no `qa_cycle` field. Keep the count in a top-level lock field `pause_counts` keyed by step, incremented in the hook before the snapshot copy: `clear_pause` deletes the `paused` record and consumes the snapshot on every lock write, so a count kept in either is lost between two pauses. The comment is already found by marker and edited in place; only the body text changes.

### Phase 2

`git grep -n 'pause_reason == "precompact"'` finds no existing Step 1 test. Lift the "another document" HALT into the fenced collision block of `shared/resources/develop-pipeline-step-1-create-branch.md`, then add `shared/resources/tests/step-1-paused-lock.test.mjs`, which extracts the blocks with `extractBlocks` (`qa-execute-snippets.mjs`) and runs the three cases in a temp directory removed in a `finally`.

### Phase 3

A scenario in `develop-pipeline-on-precompact.test.sh` using `precompact-gh-stateful.sh`: pause at step A, write the lock (`advance-pipeline-lock.sh <N>`, so the second pause is not the "already paused" repeat), pause at step B; assert two `pr-N.md` files and two `pr comment` argv lines in `$GH_LOG`. Mutate `next_n` to `echo 0` and confirm red.

## Key Patterns and References

- The stateful fixture's header comment lists the `gh` calls it models.

## Testing Approach

Mutation-prove each test, run `lint:shell`, then the whole suite through `npm run test:remote -- --run ci` from a full clone.

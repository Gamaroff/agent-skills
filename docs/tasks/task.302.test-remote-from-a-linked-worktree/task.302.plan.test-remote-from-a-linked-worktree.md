---
id: task.302.plan
title: "Implementation Plan: test:remote from a linked worktree"
type: plan
task-ref: task.302.test-remote-from-a-linked-worktree.md
---

# Implementation Plan: test:remote from a linked worktree

> Requirements and success criteria: [task.302.test-remote-from-a-linked-worktree.md](task.302.test-remote-from-a-linked-worktree.md)

## Overview

Choose between syncing the real git directory and skipping `prepare` remotely, then implement it in `scripts/remote-test/run.sh`.

## Phase-by-Phase Implementation Guide

### Phase 1

From `agent-skills-precompact`-style linked worktree, run each option by hand against a scratch directory on the server (never the C: drive) and record which tests pass or skip.

### Phase 2

Edit `run.sh` near the `.git` handling at lines 180 to 188. For option (a), resolve `git rev-parse --git-common-dir` and sync it to `.git`. For option (b), pass `--ignore-scripts` to `npm ci` in the container command and run `bash scripts/link-skills.sh` after it.

### Phase 3

Extend `tests/test-remote-runner.test.js` with a fixture whose `.git` is a file. Timeouts come from `spawnBudget`, never a literal.

## Key Patterns and References

- The stub-`ssh` style in the existing guard tests.

## Testing Approach

Offline test, mutation-proved; one live linked-worktree run; `lint:shell`.

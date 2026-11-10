---
id: task.303.plan
title: "Implementation Plan: Pause commits restart CI and block the docs-only shortcut"
type: plan
task-ref: task.303.pause-commits-restart-ci-and-block-docs-only-shortcut.md
---

# Implementation Plan: Pause commits restart CI and block the docs-only shortcut

> Requirements and success criteria: [task.303.pause-commits-restart-ci-and-block-docs-only-shortcut.md](task.303.pause-commits-restart-ci-and-block-docs-only-shortcut.md)

## Overview

Read the ancestor walk first. The fix is one of two small changes, chosen after reproducing the consumer case with a fixture.

## Phase-by-Phase Implementation Guide

### Phase 1

Read the ancestor walk in `shared/resources/ci-tree-equivalence.js`. Build a fixture of runs: head cancelled, its docs-only successor green. Record what the walk answers.

### Phase 2

Option (a): extend the walk so a cancelled run is skipped when a later run on the same branch is green. Option (b): edit the hook's push decision in `develop-pipeline-on-precompact.sh`. Edit sources under `shared/resources/` only, then `npm run bundle`.

### Phase 3

Add the fixture and the control case; mutation-prove both.

## Key Patterns and References

- The existing fixtures for `ci-tree-equivalence.js` and the dangling-link hold added in PR #873.

## Testing Approach

Mutation-prove, run `lint:shell`, then the whole suite through `npm run test:remote`.

---
id: task.297.plan
title: "Implementation Plan: QA loop fast gate and an earlier structural move"
type: plan
task-ref: task.297.qa-loop-fast-gate-and-earlier-structural-move.md
---

# Implementation Plan: QA loop fast gate and an earlier structural move

> Requirements and success criteria: [task.297.qa-loop-fast-gate-and-earlier-structural-move.md](task.297.qa-loop-fast-gate-and-earlier-structural-move.md)

## Overview

Diagnose first. The two fixes depend on what task.295's records show, so Phase 1 decides the shape of Phases 2 and 3.

## Phase-by-Phase Implementation Guide

### Phase 1: Diagnose

Read `docs/tasks/task.295.test-remote-lan-server-route/task.295.implementation.1.*.md` (QA Iteration History) and the five QA reports. Answer two questions in one paragraph each: did the fast gate run after each fix, and did the structural-move offer fire before the cycle that took it? Check `skills-config.yaml` for `develop.fastGateCommand`.

### Phase 2: The gate

Edit only `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (never a bundled copy; `npm run bundle` reverts it). Run `npm run bundle` and commit the regenerated copies.

### Phase 3: The offer

Edit `skills/qa-fix/SKILL.md` near line 636. State trigger (b) as a comparison of the current gate's `file:` entries against the files the previous fix commit changed.

### Phase 4: Tests

Behaviour tests over a fixture, not greps of the prose. Mutation-prove each.

## Key Patterns and References

- The develop loop's "What the loop runs" section, which the gate cites.
- `evals/shared/tests/` for protocol-level tests.

## Testing Approach

Run the full `npm run test:remote` after each fix.

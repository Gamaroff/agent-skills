---
id: task.298.plan
title: "Implementation Plan: review-task runs a plan's command and checks CI parity"
type: plan
task-ref: task.298.review-task-runs-plan-command-and-ci-parity.md
---

# Implementation Plan: review-task runs a plan's command and checks CI parity

> Requirements and success criteria: [task.298.review-task-runs-plan-command-and-ci-parity.md](task.298.review-task-runs-plan-command-and-ci-parity.md)

## Overview

Two additive edits to two skill documents, each with a behaviour test.

## Phase-by-Phase Implementation Guide

### Phase 1: review-task

Find the last numbered check in `skills/review-task/SKILL.md` Step 3 and add the next one. Keep the shape of the existing checks (a bold name, the rule, the worked example from task.295). Edit the source under `skills/`, then run `npm run bundle`.

### Phase 2: create-task

Add one bullet to the "Should Add" list in `skills/create-task/SKILL.md` § 3.5, in the style of the neighbouring items (an obs number, the rule, the evidence).

### Phase 3: tests

Add `tests/review-run-and-parity-checks.test.js`, modelled on `tests/review-plan-shape-checks.test.js` (which is not extended: its check-by-site loop also requires `review-story`). It reads the new review-task item and the new create-task bullet from the skills' own text and asserts trigger, safe form, no-safe-form fallback, worked example and severity. Mutation-prove each.

## Key Patterns and References

- The existing checks 20 to 30 as the style guide.

## Testing Approach

Behaviour fixtures, mutation-proved, then the whole suite through `npm run test:remote`.

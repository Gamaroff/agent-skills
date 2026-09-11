---
id: task.114.plan
title: "Implementation Plan: what a mutation run can tell you"
type: plan
task-ref: task.114.mutation-proving-outcomes.md
---

# Implementation Plan: what a mutation run can tell you

> Requirements and success criteria: [task.114.mutation-proving-outcomes.md](task.114.mutation-proving-outcomes.md)

## Overview

One document; the work is ordering twelve rules so a reader under QA-cycle pressure finds the one
that matches what they just saw.

## Phase-by-Phase Implementation Guide

### Phase 1: the table
Columns: *what you saw* · *what it may mean* · *discriminating question* · *then do*. Rows in the
order a reviewer meets them: (1) predicted test red → covered, record which; (2) a different test red
→ finding about the predicted test (#41); (3) nothing red → did the mutation apply? (#47) → is the
line feeding the assertion? (#37) → is the code dead or load-bearing? (#32) → is there a fixture for
the input class? (#19) → is a fallback absorbing it? search, don't reason (#29); (4) red only with
today's data → write the synthetic fixture, don't re-implement the predicate (#45).

### Phase 2: instrument rules (a short section before the table)
Snapshot the fix (`cp`), never `git checkout --`/`restore`/`stash`; baseline green between mutations
(#55). Assert the edit changed the file (#47). Predict the red test before running (#41). Ask what a
broken probe would print (#26). Helpers return `{ok, value}` (#16). A check is blind to what it does
not iterate (#42).

### Phase 3: consumers
Drop the count in three pointers; Step 3c gains `outcome:` per proof from the table's vocabulary.

## Key Patterns and References
`evals/shared/tests/*-parity.test.mjs` for the pointer test shape.

## Testing Approach
Parity test mutation-proved by restoring "four shapes" in one consumer.

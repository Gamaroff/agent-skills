---
id: task.299.plan
title: "Implementation Plan: Orchestration reads status and time from the instrument"
type: plan
task-ref: task.299.orchestration-status-and-timestamp-from-the-instrument.md
---

# Implementation Plan: Orchestration reads status and time from the instrument

> Requirements and success criteria: [task.299.orchestration-status-and-timestamp-from-the-instrument.md](task.299.orchestration-status-and-timestamp-from-the-instrument.md)

## Overview

Measure, fix each hit at its shared source, then hold the population with a guard.

## Phase-by-Phase Implementation Guide

### Phase 1: Measure

Use `git grep -n` over `skills/`, `shared/resources/` and `docs/` for (a) a background invocation whose last statement is an `echo` of `$?`, and (b) prose telling the author to type a timestamp. Record the exact commands.

### Phase 2: Fix

The correct form for (a): `cmd > out.log 2>&1; echo $? > status.txt`, then read `status.txt`. For (b): `date -u +%Y-%m-%dT%H:%MZ` in the same block that writes the value.

### Phase 3: Guard

A test in the style of `tests/doc-id-chokepoint.test.js` (a scan with an allowlist carrying reasons and a non-vacuity floor).

## Key Patterns and References

- `tests/doc-id-chokepoint.test.js` for the guard shape.

## Testing Approach

Fixture-based, mutation-proved, then the whole suite through `npm run test:remote`.

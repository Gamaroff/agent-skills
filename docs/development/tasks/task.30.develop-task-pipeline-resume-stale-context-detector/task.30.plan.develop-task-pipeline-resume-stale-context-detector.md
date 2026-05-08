---
id: task.30.plan
title: "Implementation Plan: develop-task pipeline resume stale-context detector"
type: plan
task-ref: task.30.develop-task-pipeline-resume-stale-context-detector.md
---

# Implementation Plan — Task 30

> Requirements and success criteria: [task.30.develop-task-pipeline-resume-stale-context-detector.md](task.30.develop-task-pipeline-resume-stale-context-detector.md)

## Overview

Mirror of [task.24 plan](../task.24.pipeline-resume-stale-context-detector/task.24.plan.pipeline-resume-stale-context-detector.md). Wire detector into develop-task's resume entry path.

## Phase 1 — Identify resume hook

In `skills/develop-task/SKILL.md`, find:
- Lock-file path (likely `.claude/state/develop-task-pipeline.lock`)
- precompact handler / resume entry section

Verify lock-file schema parity with develop-story. If divergent, document the difference in detector prompt input arg.

## Phase 2 — Wire detector

First action on resume: dispatch detector (prompt from task.24) with develop-task lock path. Main consumes JSON; halts on `blocking_issues`.

## Phase 3 — Validation

- Forced precompact mid-Step 3 + post-Step-4
- Tamper detection
- Missing summary fallback

## Notes

If lock-file schemas diverge enough to break detector prompt, raise schema-unification subtask before this task can ship.

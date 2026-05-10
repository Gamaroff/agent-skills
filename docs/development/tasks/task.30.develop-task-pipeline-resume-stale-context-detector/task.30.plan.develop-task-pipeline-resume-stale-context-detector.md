---
id: task.30.plan
title: "Implementation Plan: develop-task pipeline resume stale-context detector"
type: plan
task-ref: task.30.develop-task-pipeline-resume-stale-context-detector.md
---

# Implementation Plan — Task 30

> Requirements and success criteria: [task.30.develop-task-pipeline-resume-stale-context-detector.md](task.30.develop-task-pipeline-resume-stale-context-detector.md)

## Overview

Mirror of [task.24 plan](../task.24.pipeline-resume-stale-context-detector/task.24.plan.pipeline-resume-stale-context-detector.md). **Phases 1–2 already shipped** in task.24 commit `376924c` (PR #42), which inserted an identical Step 0a into both `skills/develop-story/SKILL.md` and `skills/develop-task/SKILL.md`. Remaining scope is Phase 3 — validation against the develop-task pipeline.

## Phase 1 — Identify resume hook (COMPLETED)

`skills/develop-task/SKILL.md:65-71` already contains Step 0a (detector dispatch). Lock path is the shared `.claude/state/develop-pipeline.lock` — no separate develop-task lock file exists. Schema parity is automatic (single shared file).

## Phase 2 — Wire detector (COMPLETED in task.24)

Step 0a in `skills/develop-task/SKILL.md` dispatches the detector via `shared/resources/pipeline-resume-detector-prompt.md`, consumes JSON, and halts on `blocking_issues`. No further wiring needed.

## Phase 3 — Validation (REMAINING)

Run against the develop-task pipeline:
- Forced precompact mid-Step 3
- Forced precompact post-Step-4 resume
- Tamper detection (corrupt a summary; verify detector flags it)
- Missing-summary fallback (delete a `step-N.json`; verify detector surfaces gap without failing)

Cross-reference task.24's test plan; same code path, same expected outcomes.

## Notes

Lock-file schema parity is guaranteed (single shared file). No schema-unification subtask required.

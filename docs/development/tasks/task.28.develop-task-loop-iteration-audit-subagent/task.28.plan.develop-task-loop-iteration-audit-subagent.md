---
id: task.28.plan
title: "Validation Plan: develop-task vs task.17 audit subagent"
type: plan
task-ref: task.28.develop-task-loop-iteration-audit-subagent.md
---

# Validation Plan — Task 28

> Requirements and success criteria: [task.28.develop-task-loop-iteration-audit-subagent.md](task.28.develop-task-loop-iteration-audit-subagent.md)

## Overview

Validation-only follow-up to [task.17](../task.17.develop-loop-iteration-audit-subagent/task.17.develop-loop-iteration-audit-subagent.md). task.17 edits the **shared** loop doc `shared/resources/develop-pipeline-step-3-develop-loop.md` which is auto-bundled into both `develop-story` and `develop-task` zips at package time. `skills/develop-task/SKILL.md:135-137` simply delegates to that shared doc — it does NOT inline a separate copy of the loop logic. Therefore task.17's edit reaches develop-task without further wiring.

This task verifies the shared edit behaves correctly under develop-task-specific context (lock-file path, report-file naming, "Implementation Plan" checkbox source vs story "Tasks" section).

## Phase 1 — Pre-validation checklist

1. Confirm task.17 merged. Read `shared/resources/develop-pipeline-step-3-develop-loop.md` and verify audit subagent dispatch is present.
2. Confirm `skills/develop-task/SKILL.md:135-137` still delegates to shared doc (no drift introduced after task.17 landed).
3. Pick a candidate task with ≥2 phases for the real run.

## Phase 2 — Real-run validation

1. Run `/develop-task` against candidate; observe audit dispatched once per iteration.
2. Verify audit JSON `completed`/`total` reflect `## Implementation Plan` phase checkboxes (not "Tasks" — that is the develop-story section name).
3. Confirm task-specific lock-file path (`{task-dir}/.develop.lock`) and report-file pattern (`task.{id}.implementation.md`) are unaffected.

## Phase 3 — Stall + malformed-JSON scenarios

1. Stall scenario: no checkbox tick + no new commit → halt at iter 2 with develop-task report log entry.
2. Malformed JSON injection → 1 retry then halt with warning, identical to develop-story behaviour.

## Phase 4 — Outcome

- All phases pass → close as PASS; record validation report at `task.28.validation.YYYY-MM-DD.md`.
- Gap found → raise focused fix PR against `shared/resources/develop-pipeline-step-3-develop-loop.md` (or open follow-up task).

## Key References

- task.17 (audit prompt + shared doc edit)
- `skills/develop-task/SKILL.md:135-137` (delegation to shared loop doc)
- `shared/resources/develop-pipeline-step-3-develop-loop.md` lines 96-104 (develop-task LOOP body)
- `shared/resources/develop-pipeline-resume-contract.md` lines 88-103 (stall semantics)

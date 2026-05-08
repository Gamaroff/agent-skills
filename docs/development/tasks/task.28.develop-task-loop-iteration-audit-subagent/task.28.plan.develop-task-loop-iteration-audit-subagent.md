---
id: task.28.plan
title: "Implementation Plan: develop-task loop iteration audit subagent"
type: plan
task-ref: task.28.develop-task-loop-iteration-audit-subagent.md
---

# Implementation Plan — Task 28

> Requirements and success criteria: [task.28.develop-task-loop-iteration-audit-subagent.md](task.28.develop-task-loop-iteration-audit-subagent.md)

## Overview

Mirror of [task.17 plan](../task.17.develop-loop-iteration-audit-subagent/task.17.plan.develop-loop-iteration-audit-subagent.md). Reuse the audit Explore prompt; wire it into develop-task's Step 3 instead of develop-pipeline-step-3-develop-loop.md.

## Phase 1 — Locate target lines

In `skills/develop-task/SKILL.md`, find Step 3 develop loop (look for `MAX_ITER`, "checkbox count", `git log -1 --format=%H`). Note line range.

## Phase 2 — Replace inline reads

Insert audit dispatch (prompt from task.17) at the same locations. Same JSON consumption pattern. Document in develop-task's resume contract section that audit JSON is the source of truth for iteration-count + last-commit-hash.

## Phase 3 — Validation

1. 3-iteration task run
2. Stall scenario at iter 2 → halt
3. Malformed-JSON injection → 1 retry then halt

## Key References

- task.17 plan for prompt
- `skills/develop-task/SKILL.md` Step 3

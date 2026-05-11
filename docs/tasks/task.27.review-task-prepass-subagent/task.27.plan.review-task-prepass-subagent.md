---
id: task.27.plan
title: "Implementation Plan: review-task pre-pass subagent"
type: plan
task-ref: task.27.review-task-prepass-subagent.md
---

# Implementation Plan — Task 27

> Requirements and success criteria: [task.27.review-task-prepass-subagent.md](task.27.review-task-prepass-subagent.md)

## Overview

Mirror of [task.16 plan](../task.16.review-story-prepass-subagent/task.16.plan.review-story-prepass-subagent.md). Drop Agent A (epic alignment); keep Agents B (architecture) and C (codebase already-implemented).

## Phase 1 — Reuse prompts

Source: `shared/resources/review-story-prepass-prompts.md` (added by task.16).

Before reuse, scan Agents B and C prompts for story-specific assumptions (e.g. "Acceptance Criteria"). Tasks have **Success Criteria** instead — adjust prompt language or add task-aware variant.

## Phase 2 — Wire into SKILL.md

`skills/review-task/SKILL.md`:
- Insert "Phase 1.5: Pre-pass" between resolution and Q&A
- Single message, 2 parallel Explore tool calls
- Both summaries fed into Q&A guidance

## Phase 3 — Catalog

```bash
npm run generate-catalog
```

## Key References

- Task.16 plan for prompt structure
- `skills/review-task/SKILL.md` resolution phase

## Testing

1. Task with architectural conflict → Agent B flags
2. Task duplicating existing utility → Agent C surfaces
3. Q&A length comparison vs baseline (target ≥30% reduction in clarifying turns)

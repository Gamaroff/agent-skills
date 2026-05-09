---
id: task.27
title: "Add review-task pre-pass: 2 parallel Explore subagents (architecture / codebase-implemented)"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: task.16
github_issue: 45
source_plan: .agents/plans/purrfect-whisper.md (Section A #1, develop-task variant)
mirrors: task.16
---

# Task 27 — `review-task` pre-pass via 2 parallel Explore subagents

**Status**: Planned

> Detailed implementation guide: [task.27.plan.review-task-prepass-subagent.md](task.27.plan.review-task-prepass-subagent.md)

## 1. Overview

Mirror of [task.16](../task.16.review-story-prepass-subagent/task.16.review-story-prepass-subagent.md) for `/review-task`. Tasks aren't part of epics, so the epic-alignment agent is dropped — only architecture-alignment and codebase-already-implemented agents are dispatched (in parallel).

**Scope**: insert read-only pre-pass into `skills/review-task/SKILL.md` between resolution and Q&A. Reuses Agent B (architecture) and Agent C (codebase scan) prompts authored in task.16.

**Key deliverables**:
- New pre-pass step in `skills/review-task/SKILL.md`
- Prompts reused from `shared/resources/review-story-prepass-prompts.md` (added by task.16)

## 2. Motivation

Same as task.16 — fewer files in main context, conflicts surfaced before Q&A. Especially valuable for technical tasks that often duplicate existing infra/refactor work.

## 3. Technical Background

**Current**: `skills/review-task/SKILL.md` resolves the task file then opens interactive Q&A.

**Target**: Phase 1.5 dispatches two Explore subagents (single message, parallel).

## 4. Scope

**In**: review-task pre-pass.
**Out**: Agent A (epic alignment) — N/A for tasks.

## 5. Breaking Changes

None — additive.

## 6. Implementation Plan

### Phase 1 — Wire dispatch (Medium)
- [ ] Add Phase 1.5 between resolution and Q&A
- [ ] Dispatch Agents B + C in parallel
- [ ] Reference shared prompts from task.16

### Phase 2 — Q&A consumption (Low)
- [ ] Q&A guidance references summaries first
- [ ] Fallback if 1 agent fails

### Phase 3 — Catalog regen (Low)
- [ ] `npm run generate-catalog`

## 7. Files Summary

**Modified**:
1. `skills/review-task/SKILL.md`

**Reused**:
2. `shared/resources/review-story-prepass-prompts.md` (added by task.16)

## 8. Testing Strategy

- Task with architectural conflict: Agent B flags
- Task duplicating existing utility: Agent C surfaces match

## 9. Success Criteria

- [ ] Pre-pass dispatched as parallel block (2 agents)
- [ ] Q&A length reduced vs baseline
- [ ] No regressions in existing review-task output

## 10. Risk Assessment

**Medium**: prompts authored in task.16 may not generalise to tasks (which lack ACs). Mitigation: review prompt text for story-specific assumptions; adjust before reuse.

## 11. Rollback Plan

Revert `skills/review-task/SKILL.md`. Pre-pass additive.

---
id: task.28
title: "Wire iteration audit Explore subagent into develop-task pipeline loop"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.25 day
depends_on: task.17
github_issue: 46
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #2, develop-task variant)
mirrors: task.17
---

# Task 28 — Develop-task pipeline iteration audit subagent

**Status**: Planned

> Detailed implementation guide: [task.28.plan.develop-task-loop-iteration-audit-subagent.md](task.28.plan.develop-task-loop-iteration-audit-subagent.md)

## 1. Overview

Mirror of [task.17](../task.17.develop-loop-iteration-audit-subagent/task.17.develop-loop-iteration-audit-subagent.md) for the `/develop-task` orchestrator. Same iteration-audit Explore prompt; wired into the develop-task pipeline's Step 3 develop loop instead of develop-story's.

**Scope**: replace inline story/task re-read + git log capture in `skills/develop-task/SKILL.md` Step 3 with the audit subagent dispatched once per iteration.

## 2. Motivation

Per task.17 — main context flat across loop iterations. Same `MAX_ITER=5` loop applies in develop-task.

## 3. Technical Background

**Current**: `skills/develop-task/SKILL.md` Step 3 inlines the same checkbox/commit-hash capture pattern as develop-story (since develop-task was adapted from develop-story).

**Target**: dispatch the audit Explore (prompt from task.17) and consume its JSON.

## 4. Scope

**In**: develop-task SKILL.md Step 3 wiring.
**Out**: audit prompt itself (owned by task.17).

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1 — Locate develop-task Step 3 inline reads (Low)
- [ ] Identify lines in `skills/develop-task/SKILL.md` matching the develop-story pattern

### Phase 2 — Replace with audit dispatch (Medium)
- [ ] Reference audit prompt from task.17
- [ ] Update stall detector pseudocode to consume JSON
- [ ] Preserve `INITIAL_COMPLETED` capture before iter 1

### Phase 3 — Validation (Low)
- [ ] Real task run with 2+ iterations
- [ ] Stall scenario verified

## 7. Files Summary

**Modified**:
1. `skills/develop-task/SKILL.md`

## 8. Testing Strategy

- 3-iteration task → audit dispatched 4× (initial + 3)
- Stall scenario halts at iteration 2

## 9. Success Criteria

- [ ] Audit dispatched once per iteration
- [ ] Task body never re-read in main during loop
- [ ] Halt decisions identical to baseline

## 10. Risk Assessment

**Medium**: develop-task pipeline differs subtly from develop-story (e.g. lock file path, report file pattern). Mitigation: cross-check against develop-task SKILL.md before merging task.17 prompt.

## 11. Rollback Plan

Revert `skills/develop-task/SKILL.md` change.

---
id: task.31
title: "Develop-task pipeline Phase 0 parallel fan-out"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.25 day
depends_on: [task.23, task.25]
github_issue: 49
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section B, develop-task variant)
mirrors: task.25
---

# Task 31 — Develop-task pipeline Phase 0 parallel fan-out

**Status**: Planned

> Detailed implementation guide: [task.31.plan.develop-task-pipeline-phase-0-parallel-fanout.md](task.31.plan.develop-task-pipeline-phase-0-parallel-fanout.md)

## 1. Overview

Mirror of [task.25](../task.25.pipeline-phase-0-parallel-fanout/task.25.pipeline-phase-0-parallel-fanout.md) for develop-task. Refactor develop-task Phase 0 to dispatch task resolver + tracker poller (task.23) + lite-mode/board detector in a single parallel block.

## 2. Motivation

Same as task.25 — three serial waits become one parallel wait.

## 3. Technical Background

`skills/develop-task/SKILL.md` Phase 0 mirrors develop-story's serial pattern: resolve task path, poll tracker, detect lite-mode.

## 4. Scope

**In**: develop-task Phase 0 refactor.
**Out**: shared poller (task.23); lock-file shape.

## 5. Breaking Changes

None — Phase 0 outputs unchanged.

## 6. Implementation Plan

### Phase 1 — Independence audit (Low)
- [ ] Confirm 3 setup steps independent
- [ ] Document any sequencing requirement

### Phase 2 — Refactor dispatch (Medium)
- [ ] Single message, 3 parallel tool calls
- [ ] Aggregate before lock-file write

### Phase 3 — Validation (Low)
- [ ] Wall-clock baseline vs new
- [ ] Failure-of-one scenario

## 7. Files Summary

**Modified**:
1. `skills/develop-task/SKILL.md`

## 8. Testing Strategy

Real run on representative task. Compare wall-clock.

## 9. Success Criteria

- [ ] 3 dispatches in single block
- [ ] Lock-file unchanged
- [ ] Wall-clock reduced ≥50%

## 10. Risk Assessment

**Low**: identical to task.25.

## 11. Rollback Plan

Revert SKILL.md change. Serial path preserved in git history.

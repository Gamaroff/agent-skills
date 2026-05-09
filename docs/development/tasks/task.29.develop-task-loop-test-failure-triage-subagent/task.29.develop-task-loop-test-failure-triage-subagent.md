---
id: task.29
title: "Wire test-failure triage Explore subagent into develop-task pipeline loop"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.25 day
depends_on: task.18
github_issue: 47
source_plan: .agents/plans/purrfect-whisper.md (Section A #3, develop-task variant)
mirrors: task.18
---

# Task 29 — Develop-task pipeline test-failure triage subagent

**Status**: Planned

> Detailed implementation guide: [task.29.plan.develop-task-loop-test-failure-triage-subagent.md](task.29.plan.develop-task-loop-test-failure-triage-subagent.md)

## 1. Overview

Mirror of [task.18](../task.18.develop-loop-test-failure-triage-subagent/task.18.develop-loop-test-failure-triage-subagent.md) for develop-task. Reuses the triage prompt; wires log capture + dispatch into the develop-task pipeline.

## 2. Motivation

Same as task.18 — failed test logs never enter main context.

## 3. Technical Background

`skills/develop-task/SKILL.md` Step 3 currently streams test output to main on failure. Replace with capture-to-file then triage dispatch.

## 4. Scope

**In**: develop-task SKILL.md Step 3 wiring.
**Out**: triage prompt (owned by task.18).

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1 — Output capture (Low)
- [ ] Replace `npx test ...` invocation with `> .claude/state/test-output-<iter>-<ts>.log 2>&1`

### Phase 2 — Wire triage dispatch (Medium)
- [ ] On non-zero exit, dispatch triage (prompt from task.18)
- [ ] Main consumes summary only; never reads raw log

### Phase 3 — Cleanup (Low)
- [ ] Delete temp log on step completion

## 7. Files Summary

**Modified**:
1. `skills/develop-task/SKILL.md`

## 8. Testing Strategy

- Inject failing test → triage classifies; main never loads log
- 100+ failures → cap respected via task.18 prompt

## 9. Success Criteria

- [ ] Test logs never read into main context
- [ ] Triage summary surfaces in implementation report
- [ ] Cleanup confirmed

## 10. Risk Assessment

Same as task.18 — triage misclassification → biased toward "real" per task.18 prompt.

## 11. Rollback Plan

Revert SKILL.md change; streaming-to-main path restored.

---
id: task.30
title: "Wire pipeline resume stale-context detector into develop-task orchestrator"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.25 day
depends_on: [task.24, task.26]
github_issue: 48
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #9, develop-task variant)
mirrors: task.24
---

# Task 30 — Develop-task pipeline resume detector subagent

**Status**: Planned

> Detailed implementation guide: [task.30.plan.develop-task-pipeline-resume-stale-context-detector.md](task.30.plan.develop-task-pipeline-resume-stale-context-detector.md)

## 1. Overview

Mirror of [task.24](../task.24.pipeline-resume-stale-context-detector/task.24.pipeline-resume-stale-context-detector.md) for develop-task. Wires the resume-detector Explore (prompt from task.24) into develop-task's resume entry point.

## 2. Motivation

Same as task.24 — resume reads only summaries + lock, not raw artifacts.

## 3. Technical Background

`skills/develop-task/SKILL.md` defines its own resume contract and lock-file path. Detector prompt is generic enough to consume either pipeline's lock format provided the path is supplied as input.

## 4. Scope

**In**: develop-task resume entry wiring.
**Out**: detector prompt (owned by task.24); `.summaries/` convention (owned by task.26).

## 5. Breaking Changes

None — depends on task.26 artifacts existing for develop-task runs.

## 6. Implementation Plan

### Phase 1 — Identify develop-task resume hook (Low)
- [ ] Locate resume entry in `skills/develop-task/SKILL.md` (precompact handler)
- [ ] Confirm lock-file path differs from develop-story (likely `.claude/state/develop-task-pipeline.lock`)

### Phase 2 — Wire detector dispatch (Medium)
- [ ] First action on resume: dispatch detector with develop-task lock path
- [ ] Main consumes JSON; halt if `blocking_issues` non-empty

### Phase 3 — Validation (Medium)
- [ ] Forced precompact mid-Step 3 + post-Step-4 resume scenarios

## 7. Files Summary

**Modified**:
1. `skills/develop-task/SKILL.md`

## 8. Testing Strategy

Same as task.24, run against develop-task pipeline.

## 9. Success Criteria

- [ ] Resume reads only summaries + lock
- [ ] Recommended-step matches manual baseline

## 10. Risk Assessment

**Medium**: develop-task lock-file schema may differ from develop-story. Mitigation: detector prompt accepts lock path arg; verify schema parity first.

## 11. Rollback Plan

Revert resume hook in develop-task SKILL.md.

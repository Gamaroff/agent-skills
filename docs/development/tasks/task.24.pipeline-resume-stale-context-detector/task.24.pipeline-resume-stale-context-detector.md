---
id: task.24
title: "Add pipeline-resume stale-context detector Explore subagent"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: task.26
github_issue: 42
source_plan: .agents/plans/purrfect-whisper.md (Section A #9)
---

# Task 24 — Pipeline resume stale-context detector subagent

**Status**: Planned

> Detailed implementation guide: [task.24.plan.pipeline-resume-stale-context-detector.md](task.24.plan.pipeline-resume-stale-context-detector.md)

## 1. Overview

When the precompact hook pauses the pipeline mid-step and the agent later resumes, today main context re-reads every artifact (lock, story, plan, implementation report, QA artifacts) to rebuild state.

**Scope**: dispatch a single Explore subagent at resume time that diffs lock-file timestamp against artifact mtimes plus reads the stored `.summaries/<step>.json` (created by task.26), returning a "what changed since pause" delta and the recommended resume step.

## 2. Motivation

- Resume is the worst-case context burner (full re-read of every step's outputs)
- Stale-detection logic deserves to be subagent-resident, not main-resident

## 3. Technical Background

**Current**: `develop-pipeline-resume-contract.md` documents resume but main does the reads.

**Target**: subagent reads `.claude/state/develop-pipeline.lock` + co-located summaries + artifact mtimes. Returns: `{recommended_step, deltas_since_pause: [...], blocking_issues: [...]}`.

## 4. Scope

**In**: resume-time stale detection.
**Out**: actual step re-execution (main owns).

## 5. Breaking Changes

None — depends on task.26 summary artifacts existing.

## 6. Implementation Plan

### Phase 1 — Schema (Low)
- [ ] Output JSON schema with deltas + blocking_issues
- [ ] Define "delta" granularity (file path + new mtime)

### Phase 2 — Detector prompt (Medium)
- [ ] Read lock + summaries + mtimes
- [ ] Decide resume step based on `current_step` + summary presence

### Phase 3 — Wire into resume contract (Medium)
- [ ] Dispatch as first action on resume
- [ ] Main consumes JSON, never re-reads artifacts itself

### Phase 4 — Validation (Medium)
- [ ] Pause mid-Step 3, resume; confirm correct step + no spurious deltas
- [ ] Pause mid-Step 7, resume; same
- [ ] Tamper with artifact mtime mid-pause; confirm flagged

## 7. Files Summary

**Modified**:
1. `skills/develop-story/references/develop-pipeline-resume-contract.md`
2. `skills/develop-story/SKILL.md` (resume entry point)

**New**:
3. `shared/resources/pipeline-resume-detector-prompt.md`

## 8. Testing Strategy

- Forced precompact at known points; resume; compare state vs baseline manual restart
- Tamper test: external `touch` on artifact between pause/resume

## 9. Success Criteria

**Functional**:
- [ ] Resume reads only summaries + lock, never raw artifacts
- [ ] Recommended-step decision matches manual baseline on golden cases

**Performance**:
- [ ] Resume main token usage reduced ≥80%

**Quality**:
- [ ] Tamper detection works

**Migration**:
- [ ] Requires task.26 summary artifacts before this task is useful

## 10. Risk Assessment

**Medium**: subagent recommends wrong step → pipeline restarts wrong work. Mitigation: detector output goes to user for confirmation on first 5 production runs; auto-accept after.

**Low**: missing summary file → fall back to manual artifact read.

## 11. Rollback Plan

Revert resume-contract changes; manual artifact-read path preserved in git history.

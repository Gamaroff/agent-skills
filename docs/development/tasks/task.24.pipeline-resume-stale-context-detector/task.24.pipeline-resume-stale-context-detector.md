---
id: task.24
title: "Add pipeline-resume stale-context detector Explore subagent"
type: task
category: refactoring
priority: Medium
status: ready-for-review
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: task.26
github_issue: 42
source_plan: .agents/plans/purrfect-whisper.md (Section A #9)
---

# Task 24 — Pipeline resume stale-context detector subagent

**Status**: Ready for Review
**Review**: ✅ All review recommendations from `task.24.review.2026-05-09.md` implemented 2026-05-09

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
- [x] Output JSON schema with deltas + blocking_issues
- [x] Define "delta" granularity (file path + new mtime)

### Phase 2 — Detector prompt (Medium)
- [x] Read lock + summaries + mtimes
- [x] Decide resume step based on `current_step` + summary presence

### Phase 3 — Wire into resume contract (Medium)
- [x] Add new "Phase 0a — Detector dispatch" to `shared/resources/develop-pipeline-resume-contract.md`, immediately preceding existing Phase 0b artifact verification
- [x] Detector dispatched first on resume; its `recommended_step` narrows which steps Phase 0b then verifies
- [x] Wire the resume entry path in BOTH `skills/develop-story/SKILL.md` and `skills/develop-task/SKILL.md`
- [x] Main consumes JSON, never re-reads artifacts itself
- [x] If `blocking_issues` non-empty → surface to user, halt

### Phase 4 — Validation (Medium)
- [ ] Pause mid-Step 3, resume; confirm correct step + no spurious deltas
- [ ] Pause mid-Step 7, resume; same
- [ ] Tamper with artifact mtime mid-pause; confirm flagged

## 7. Files Summary

**Modified**:
1. `shared/resources/develop-pipeline-resume-contract.md` (add Phase 0a detector section)
2. `skills/develop-story/SKILL.md` (resume entry point — dispatch detector before Phase 0b)
3. `skills/develop-task/SKILL.md` (resume entry point — dispatch detector before Phase 0b)

**New**:
4. `shared/resources/pipeline-resume-detector-prompt.md`

## 8. Testing Strategy

- Forced precompact at known points; resume; compare state vs baseline manual restart
- Tamper test: external `touch` on artifact between pause/resume

## 9. Success Criteria

**Functional**:
- [x] Resume reads only summaries + lock, never raw artifacts — orchestrator dispatches Explore subagent; main never re-reads raw artifacts
- [ ] Recommended-step decision matches manual baseline on golden cases — requires integration testing (Phase 4)

**Performance**:
- [ ] Resume main token usage reduced ≥80% — requires measurement via integration testing (Phase 4)

**Quality**:
- [ ] Tamper detection works — requires integration testing (Phase 4)

**Migration**:
- [x] Requires task.26 summary artifacts before this task is useful — task.26 accepted ✅

## 10. Risk Assessment

**Medium**: subagent recommends wrong step → pipeline restarts wrong work. Mitigation: detector output is always surfaced to the user on resume; user confirms before main proceeds. No silent auto-acceptance.

**Low**: missing summary file → fall back to manual artifact read.

## 11. Rollback Plan

Revert resume-contract changes; manual artifact-read path preserved in git history.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Agent
**Testing Date**: 2026-05-10
**Quality Score**: 73/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.24.qa.1.pipeline-resume-stale-context-detector.md](./task.24.qa.1.pipeline-resume-stale-context-detector.md)
- **Gate File**: [task.24.gate.1.pipeline-resume-stale-context-detector.yml](./task.24.gate.1.pipeline-resume-stale-context-detector.yml)

### Test Coverage Summary
- **Tests Executed**: 0 (documentation task — no code)
- **Phases Verified**: 3/4 (Phase 4 deferred)
- **Critical Issues**: 0 HIGH, 2 MEDIUM
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
- Issue 1 (MEDIUM/P1): Detector gap logic flags steps 1 and 4 as missing summaries — only steps 2 and 8 are exempted, causes false `blocking_issues` on resume from Step 5+
- Issue 2 (MEDIUM/P2): Phase 0b header lacks explicit cross-reference to Phase 0a scope narrowing — maintenance hazard

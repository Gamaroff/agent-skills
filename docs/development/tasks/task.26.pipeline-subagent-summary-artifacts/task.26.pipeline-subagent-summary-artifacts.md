---
id: task.26
title: "Pipeline context-hygiene: persist subagent summaries as artifacts (.summaries/)"
type: task
category: infrastructure
priority: High
status: accepted
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 44
source_plan: .agents/plans/purrfect-whisper.md (Section C)
---

# Task 26 — Pipeline subagent summary artifacts

**Status**: Accepted
**Review**: ✅ All review recommendations from `task.26.review.2026-05-08.md` implemented 2026-05-08

> Detailed implementation guide: [task.26.plan.pipeline-subagent-summary-artifacts.md](task.26.plan.pipeline-subagent-summary-artifacts.md)

## 1. Overview

Subagent summaries (the structured outputs from tasks 16-25) currently live only in the implementation report or main context. To support context-hygiene rule "release intermediate file contents" and resume detection (task.24), summaries need to be persisted as JSON artifacts.

**Scope**: define a `.summaries/<step>.json` artifact convention, add a column `subagent_summary_ref` to the implementation report's Pipeline Progress table, and update each step file to write its subagent summaries to disk.

**Key deliverables**:
- `.summaries/` directory convention documented
- Schema per step (one JSON per step)
- Implementation report column added
- Step files write summaries on completion

## 2. Motivation

- Context-hygiene enforcement: main can release file contents knowing summary is durable
- Resume robustness: summaries replayed instead of artifacts re-read (enables task.24)
- Audit: surfaced subagent reasoning preserved alongside the run

## 3. Technical Background

**Current**: SKILL.md §"Context Management Rule" (lines 101-109) says retain summaries; today summaries live in main memory + implementation report markdown body.

**Target**: each step's summary persisted to `<task-dir>/.summaries/step-<N>.json` (or analogous for stories). Implementation report gains column referencing the path.

## 4. Scope

**In**: artifact convention + schema + report column (covers both `develop-story` and `develop-task` pipelines — they share `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` for the impl-report template). Pilot wiring of ONE existing subagent step (e.g. task.16 review-story-prepass) as proof.
**Out**: wiring the remaining tasks 17-25 to write their summaries (those tasks reference this task's convention).

## 5. Breaking Changes

Implementation report column addition — backwards-compatible (new column appended).

## 6. Implementation Plan

### Phase 1 — Convention (Low)
- [x] Path: `<task-or-story-dir>/.summaries/step-<N>-<name>.json`
- [x] Schema: `{schema_version: 1, step, agent, dispatched_at, completed_at, summary, raw_artifact_paths: []}`

### Phase 2 — Implementation report (Medium)
- [x] Append `Subagent summary ref` as 5th column to Pipeline Progress table in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (lines 394, 473) — preserves existing `Step | Status | Required Artifacts | Notes` columns (backwards-compatible)
- [x] Same change covers both `develop-story` and `develop-task` pipelines (shared template)

### Phase 3 — Step file documentation (Medium)
- [x] Document write pattern in `shared/resources/subagent-summary-artifact.md` (new)
- [x] Add fallback for steps without subagents (column = `—`)
- [x] Reference convention from both `skills/develop-story/SKILL.md` (Context Management Rule, line 101) and `skills/develop-task/SKILL.md` (Context Management Rule, line 99)

### Phase 4 — `.gitignore` (Low)
- [x] Add `.summaries/` to repo `.gitignore`

### Phase 5 — Validation + pilot (Low)
- [x] `jq -e '.schema_version == 1' .summaries/step-*.json` returns 0 — fixture validation passed
- [ ] Pilot wire task.16 review-story-prepass to write `.summaries/step-2-review-prepass.json` — **DEFERRED to task.16** (subagent does not yet exist; pilot belongs in that task's implementation)
- [ ] Implementation report column populated — populated by future pipeline runs as subagents are wired (column defaults to `—` for in-flight runs)
- [ ] Resume reads summary successfully (smoke test for task.24) — **DEFERRED to task.24** (resume detector not yet built; resume contract updated to specify the read pattern)

## 7. Files Summary

**Modified**:
1. `skills/develop-story/SKILL.md` (Context Management Rule, line 101)
2. `skills/develop-task/SKILL.md` (Context Management Rule, line 99)
3. `shared/resources/develop-pipeline-resume-contract.md`
4. `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (Pipeline Progress table at lines 394, 473 — append column)
5. `.gitignore` (add `.summaries/`)

**New**:
6. `shared/resources/subagent-summary-artifact.md` (convention spec)

## 8. Testing Strategy

- Single-step smoke: subagent writes summary, file exists, JSON valid
- Resume smoke: read summary file, parse, surface to main
- Round-trip: write → read → assert schema match

## 9. Success Criteria

**Functional**:
- [ ] Convention documented
- [ ] Schema validated (jq test)
- [ ] Implementation report column added
- [ ] At least one step file writes example summary in validation

**Performance**:
- [ ] Summary writes ≤1KB each
- [ ] No measurable wall-clock impact

**Quality**:
- [ ] Schema is forward-compatible (versioned)

**Migration**:
- [ ] Existing in-flight pipelines (no `.summaries/`) tolerate absence (column `—`)

## 10. Risk Assessment

**Medium**: schema versioning ignored, future drift breaks task.24. Mitigation: include `schema_version: 1` field upfront.

**Low**: `.summaries/` accidentally committed. Mitigation: add to `.gitignore`.

## 11. Rollback Plan

Revert the 4 file changes. `.summaries/` directories on disk are inert without callers.

**Trigger**: Schema proves wrong shape after first integration; redesign before writers proliferate.

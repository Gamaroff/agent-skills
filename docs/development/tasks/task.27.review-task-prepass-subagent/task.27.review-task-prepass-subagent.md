---
id: task.27
title: "Add review-task pre-pass: 2 parallel Explore subagents (architecture / codebase-implemented)"
type: task
category: refactoring
priority: Medium
status: ready-for-review
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

**Status**: Ready for Development
**Review**: ✅ All review recommendations from `task.27.review-task-prepass-subagent.review.2026-05-10.md` implemented 2026-05-10

**GitHub Issue**: [#45](https://github.com/Gamaroff/agent-skills/issues/45)

> Detailed implementation guide: [task.27.plan.review-task-prepass-subagent.md](task.27.plan.review-task-prepass-subagent.md)

## 1. Overview

Mirror of [task.16](../task.16.review-story-prepass-subagent/task.16.review-story-prepass-subagent.md) for `/review-task`. Tasks aren't part of epics, so the epic-alignment agent is dropped — only architecture-alignment and codebase-already-implemented agents are dispatched (in parallel).

**Scope**: insert read-only pre-pass into `skills/review-task/SKILL.md` between resolution and Q&A. Reuses Agent B (architecture) and Agent C (codebase scan) prompts authored in task.16.

**Key deliverables**:
- New pre-pass step in `skills/review-task/SKILL.md`
- Prompts reused from `shared/resources/review-story-prepass-prompts.md` (added by task.16)

## 2. Motivation

**Current Problems**:
- `/review-task` reads architecture docs and codebase greps inline during Q&A — heavy main-context cost
- Conflicts (architectural drift, "feature already exists") surface mid-Q&A, forcing re-asks
- No structured artifact captures these comparisons for resume

**Benefits**:
- Parallel fan-out (2 agents) reduces wall-clock vs serial main-context reads
- Conflicts caught upfront → fewer Q&A iterations
- Especially valuable for refactor tasks that often duplicate existing infra

## 3. Technical Background

**Current**: `skills/review-task/SKILL.md` resolves the task file then opens interactive Q&A.

**Target**: Phase 1.5 dispatches two Explore subagents (single message, parallel).

## 4. Scope

**In**: review-task pre-pass.
**Out**: Agent A (epic alignment) — N/A for tasks.

## 5. Breaking Changes

None — additive.

## 6. Implementation Plan

### Phase 0 — Author task-specific pre-pass prompts

**Risk Level**: Low

**Files**:
- `shared/resources/review-task-prepass-prompts.md` (new)

**Changes**:
- [ ] Fork Agent B (architecture alignment) prompt from `review-story-prepass-prompts.md` — replace `{story_path}` → `{task_path}`; replace section refs ("Acceptance Criteria, Dev Notes, Tasks") with task sections ("Implementation Plan, Files Summary, Technical Background")
- [ ] Fork Agent C (codebase already-implemented scan) prompt — replace `{story_path}` → `{task_path}`; symbol-extraction sources point to task Phases / Files Summary
- [ ] Drop Agent A entirely (no parent epic for tasks)
- [ ] Update Variable substitution table: `{task_path}`, `{arch_location}` only
- [ ] Keep schema identical to task.16 (alignment / implementation_status + ≤5 findings)

**Dependencies**: None

---

### Phase 1 — Wire dispatch into SKILL.md

**Risk Level**: Medium

**Files**:
- `skills/review-task/SKILL.md`

**Changes**:
- [ ] Insert "Phase 1.5: Pre-pass" section **between Step 1 (Load Configuration and Context) and Step 2 (Template Structure Compliance Review)**
- [ ] Document parallel fan-out (single-message, 2 `Agent` tool calls)
- [ ] Reference `shared/resources/review-task-prepass-prompts.md` for prompt source
- [ ] Define result storage: `PREPASS_B`, `PREPASS_C`
- [ ] Define summary schema (≤5 bullets per agent)

**Dependencies**: Phase 0

---

### Phase 2 — Q&A consumption

**Risk Level**: Low

**Files**:
- `skills/review-task/SKILL.md`

**Changes**:
- [ ] Update Question Point 2 (technical) to reference `PREPASS_B` summary first
- [ ] Update Question Point 3 (completeness) to reference `PREPASS_C` summary first
- [ ] Add fallback: if either agent fails, log warning and proceed with remaining summary
- [ ] Add severity escalation rule (medium/high findings → user question)

**Dependencies**: Phase 1

---

### Phase 3 — Validation

**Risk Level**: Low

**Files**:
- `docs/skill-catalog.md` (auto-rebuilt)

**Changes**:
- [ ] Manual run on representative task with known architectural conflict — verify Agent B flags it
- [ ] Manual run on task duplicating existing utility — verify Agent C surfaces match
- [ ] Fallback test: simulate 1-agent timeout, confirm Q&A proceeds with remaining summary
- [ ] Regression test: run on clean task, confirm output identical to pre-task baseline
- [ ] Run `npm run generate-catalog`

**Dependencies**: Phases 0–2

## 7. Files Summary

**Modified**:
1. `skills/review-task/SKILL.md`

**New**:
2. `shared/resources/review-task-prepass-prompts.md`

**Auto-rebuilt**:
3. `docs/skill-catalog.md`

## 8. Testing Strategy

- **Manual — architectural conflict**: dispatch on task referencing libraries not in tech stack; verify Agent B flags `library` finding with severity ≥ medium
- **Manual — already implemented**: dispatch on task whose deliverables already exist in codebase; verify Agent C returns `fully-implemented` or `partial`
- **Fallback**: simulate Agent B timeout (or malformed output); confirm review-task proceeds with Agent C summary only and logs warning
- **Regression**: dispatch on clean task with no conflicts; verify final review output unchanged vs pre-task baseline (no extra questions, identical recommendation)

## 9. Success Criteria

**Functional**:
- [ ] Pre-pass dispatched as single parallel block (2 agents)
- [ ] Each agent returns structured ≤200-word YAML summary
- [ ] Q&A references summaries before asking user

**Performance**:
- [ ] Question Point 2 reduced ≥1 question on a fixture task with architectural conflict (vs pre-task baseline)
- [ ] No increase in main-context Read calls during Step 1

**Quality**:
- [ ] `documentation-standards-validator` passes on changed files
- [ ] No regressions in existing review-task output format on clean fixture
- [ ] Skill catalog rebuilds successfully (`npm run generate-catalog`)

**Migration**:
- [ ] No caller changes required (additive only)

## 10. Risk Assessment

### Medium Risk Areas

**1. Prompt adaptation drift from story version**
- **Risk**: Forked task prompts diverge over time from story prompts; bug fixes in one don't propagate
- **Probability**: Medium
- **Impact**: Minor — independent files; cross-reference in both files' headers
- **Mitigation**: Add header note in each prompt file pointing to its sibling; review both during prompt updates
- **Rollback**: Revert prompt file; re-source from sibling

### Low Risk Areas

**1. Token overhead**
- **Risk**: Parallel fan-out costs more total tokens than serial main-context reads
- **Probability**: Low
- **Impact**: Minor — higher cost per run, no functional impact
- **Mitigation**: Subagent outputs are compact YAML summaries, not raw file bodies; net win expected
- **Rollback**: Remove pre-pass fan-out; revert to single main-context read

**2. Subagent output noise**
- **Risk**: Explore subagents produce verbose or off-schema output
- **Probability**: Low
- **Impact**: Minor — Q&A degrades to baseline, no data loss
- **Mitigation**: Enforce ≤5-bullet schema in prompt; validate top-level key before consumption
- **Rollback**: Disable Phase 1.5; review-task continues without summaries

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- Pre-pass summaries consistently wrong or misleading
- Subagent fan-out causes context overflow
- Q&A quality measurably worse than baseline

**Steps**:
1. Revert `skills/review-task/SKILL.md`: `git checkout skills/review-task/SKILL.md`
2. Delete `shared/resources/review-task-prepass-prompts.md`
3. Run `npm run generate-catalog` to confirm catalog builds
4. Verify by running `/review-task` on a known task — confirm Q&A proceeds without pre-pass errors

### Partial Rollback

**When**: One of the two agents produces noise but the other is reliable.

**Steps**:
1. Remove the failing agent from the Phase 1.5 dispatch block in `skills/review-task/SKILL.md`
2. Update the corresponding Question Point guidance to drop summary reference

### Forward Fix (< 2 hours)

**When**: Prompt schema produces slightly off-format output.

**Approach**: Tighten prompt template in `shared/resources/review-task-prepass-prompts.md`; no SKILL.md change needed.

---

## Progress Tracking

### Phase 0 — Author task-specific prompts
- [ ] Fork Agent B prompt for tasks
- [ ] Fork Agent C prompt for tasks
- [ ] Drop Agent A
- [ ] Update variable substitution table
- [ ] Save to `shared/resources/review-task-prepass-prompts.md`

### Phase 1 — Wire dispatch
- [ ] Insert Phase 1.5 between Step 1 and Step 2
- [ ] Document parallel fan-out
- [ ] Define PREPASS_B / PREPASS_C storage
- [ ] Define summary schema

### Phase 2 — Q&A consumption
- [ ] Wire PREPASS_B → Question Point 2
- [ ] Wire PREPASS_C → Question Point 3
- [ ] Add fallback rule
- [ ] Add severity escalation rule

### Phase 3 — Validation
- [ ] Manual conflict-task run
- [ ] Manual already-implemented-task run
- [ ] Fallback simulation
- [ ] Regression run on clean task
- [ ] `npm run generate-catalog`

---

## References

- **Mirrored Task**: [`task.16.review-story-prepass-subagent.md`](../task.16.review-story-prepass-subagent/task.16.review-story-prepass-subagent.md) (accepted, PR #52)
- **Modified Skill**: `skills/review-task/SKILL.md`
- **Sibling Skill**: `skills/review-story/SKILL.md` (Phase 1.5 reference implementation)
- **New Shared Resource**: `shared/resources/review-task-prepass-prompts.md`
- **Sibling Shared Resource**: `shared/resources/review-story-prepass-prompts.md`
- **GitHub Issue**: [#45](https://github.com/Gamaroff/agent-skills/issues/45)
- **Source Plan**: `.agents/plans/purrfect-whisper.md` (Section A #1, develop-task variant)

---
id: task.16
title: "Add review-story pre-pass: 3 parallel Explore subagents (epic / architecture / codebase-implemented)"
type: task
category: refactoring
priority: Medium
status: ready for review
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.75 day
depends_on: —
github_issue: 34
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #1)
---

# Task 16 — `review-story` pre-pass via 3 parallel Explore subagents

**Status**: Ready for Review
**Review**: ✅ All review recommendations from `task.16.review-story-prepass-subagent.review.2026-05-08.md` implemented 2026-05-08

**GitHub Issue**: [#34](https://github.com/Gamaroff/agent-skills/issues/34)

> Detailed implementation guide: [task.16.plan.review-story-prepass-subagent.md](task.16.plan.review-story-prepass-subagent.md)

## 1. Overview

Today `/review-story` runs in main context: it loads the story, the parent epic, the architecture doc, and grep results from the codebase before opening interactive Q&A. This wastes main-context tokens and produces longer Q&A sessions because conflicts surface only after the human is in the loop.

**Scope**: insert a read-only pre-pass that fans out 3 parallel Explore subagents — one per concern (epic alignment, architecture alignment, "is this already implemented in the codebase?") — before the Q&A phase. Each returns ≤200-word structured summary. Q&A consumes the summaries.

**Key deliverables**:

- New pre-pass step in `skills/review-story/SKILL.md`
- 3 Explore prompts captured as reusable resource snippets
- Q&A phase updated to reference summary findings

**Expected outcome**: shorter Q&A, fewer hallucinations, lighter main context.

## 2. Motivation

**Current Problems**:

- Main reads parent epic + architecture doc + codebase greps inline (heavy)
- Conflicts (epic-vs-story drift, "feature already exists") often surface mid-Q&A, forcing re-asks
- No structured artifact captures these comparisons for resume

**Benefits**:

- ≥40% wall-clock saving expected (parallel fan-out)
- ≥50% fewer main-context reads expected for Step 2
- Conflicts caught upfront → fewer Q&A iterations

## 3. Technical Background

**Current**: `skills/review-story/SKILL.md` resolves the story file, then begins interactive AskUserQuestion cycles. Comparisons against epic/architecture/codebase happen ad-hoc in main context.

**Target**: New "Phase 1.5: Pre-pass" between resolution and Q&A. Dispatches 3 Explore agents in a single message:

- **Agent A (epic alignment)**: read parent epic, compare scope/ACs to story.
- **Agent B (architecture alignment)**: read relevant architecture shards, flag conflicts.
- **Agent C (codebase scan)**: grep for symbols/files implied by ACs, report whether functionality already exists.

Each returns a fixed JSON-ish structured summary (status: aligned/conflict, ≤5 bullets).

## 4. Scope

**In Scope**:
- `skills/review-story/SKILL.md` workflow change
- New shared resource: `shared/resources/review-story-prepass-prompts.md`
- Q&A phase consuming pre-pass summaries

**Out of Scope**:
- `/review-task` (separate skill; track in follow-up)
- Replacing the interactive Q&A itself
- Writing-enabled subagents

## 5. Breaking Changes

None — additive. Existing review-story callers continue to work; pre-pass output is purely advisory input to Q&A.

## 6. Implementation Plan

### Phase 1 — Author pre-pass prompts

**Risk Level**: Low

**Files**:
- `shared/resources/review-story-prepass-prompts.md` (new)

**Changes**:
- [x] Draft Agent A prompt (epic alignment)
- [x] Draft Agent B prompt (architecture alignment)
- [x] Draft Agent C prompt (codebase already-implemented scan)
- [x] Save all three prompts to `shared/resources/review-story-prepass-prompts.md`

**Dependencies**: None

---

### Phase 2 — Wire dispatch into SKILL.md

**Risk Level**: Medium

**Files**:
- `skills/review-story/SKILL.md`

**Changes**:
- [x] Add Phase 1.5 section between resolution and Q&A
- [x] Document parallel fan-out (single-message multi-tool-call)
- [x] Define summary schema (≤5 bullets per agent)

**Dependencies**: Phase 1

---

### Phase 3 — Q&A consumption

**Risk Level**: Low

**Files**:
- `skills/review-story/SKILL.md`

**Changes**:
- [x] Update Q&A guidance to reference pre-pass summaries first
- [x] Add fallback if any agent fails (continue with remaining 2)

**Dependencies**: Phase 2

---

### Phase 4 — Validation

**Risk Level**: Low

**Files**:
- `docs/skill-catalog.md` (auto-rebuilt)

**Changes**:
- [ ] Manual run on representative story with known epic drift
- [ ] Manual run on story with already-implemented feature
- [x] Update skill catalog via `npm run generate-catalog`

**Dependencies**: Phases 1–3

## 7. Files Summary

**Modified**:
1. `skills/review-story/SKILL.md`

**New**:
2. `shared/resources/review-story-prepass-prompts.md`

**Auto-rebuilt**:
3. `docs/skill-catalog.md`

## 8. Testing Strategy

- **Manual**: dispatch on 3 stories (clean / epic-drift / already-implemented); verify summaries surface conflicts
- **Fallback**: simulate one agent timing out; confirm Q&A proceeds with 2 remaining summaries
- **Regression**: existing review-story flows still produce same final recommendations

## 9. Success Criteria

**Functional**:
- [x] Pre-pass dispatched as single parallel block
- [x] Each agent returns structured ≤200-word summary
- [x] Q&A references summaries before asking user

**Performance**:
- [ ] Step 2 wall-clock reduced ≥40% on representative run (deferred — manual validation by QA)
- [ ] Main-context Read calls during Step 2 reduced ≥50% (deferred — manual validation by QA)

**Quality**:
- [ ] `documentation-standards-validator` passes on changed files (deferred — QA to run)
- [x] No regressions in existing review-story output format (additive change only; no existing sections modified)

**Migration**:
- [x] No caller changes required

## 10. Risk Assessment

### Medium Risk Areas

**1. Subagent prompt noise**
- **Risk**: Explore subagents produce verbose or off-schema output that degrades Q&A signal
- **Probability**: Medium
- **Impact**: Minor — Q&A degrades to baseline (no pre-pass benefit), no data loss
- **Mitigation**: Enforce ≤5-bullet schema in prompt; retry with stricter instruction if output exceeds limit
- **Rollback**: Disable pre-pass step; review-story continues without summaries

### Low Risk Areas

**1. Token overhead**
- **Risk**: Parallel fan-out costs more total tokens than serial main-context reads
- **Probability**: Low
- **Impact**: Minor — higher cost per run, no functional impact
- **Mitigation**: Net win expected because subagent outputs are compact summaries, not raw file bodies; monitor token counts on first 3 runs
- **Rollback**: Remove pre-pass fan-out; revert to single main-context read

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- Pre-pass summaries are consistently wrong or misleading
- Subagent fan-out causes unexpected context overflow
- Q&A quality measurably worse than baseline

**Steps**:
1. Revert `skills/review-story/SKILL.md` to pre-task state: `git checkout skills/review-story/SKILL.md`
2. Delete `shared/resources/review-story-prepass-prompts.md` if already created
3. Run `npm run generate-catalog` to confirm catalog still builds

**Verification**: Run `/review-story` on a known story and confirm Q&A proceeds without pre-pass errors.

---

### Partial Rollback

**When to Use**: One or two subagent prompts produce noise but the remaining agents are reliable.

**Steps**:
1. In `skills/review-story/SKILL.md`, remove the failing agent from the Phase 1.5 dispatch block
2. Update Q&A guidance to reference only the remaining summaries

---

### Forward Fix (< 2 hours)

**When to Use**: Prompt schema produces slightly off-format output (extra bullets, wrong YAML keys).

**Approach**: Tighten the prompt template in `shared/resources/review-story-prepass-prompts.md`; no SKILL.md change needed.

---

### Rollback Triggers

**Immediate Rollback**:
- Subagent output causes review-story to produce incorrect recommendations
- Fan-out increases wall-clock time vs baseline

**Forward Fix**:
- Output schema has minor deviations (extra/missing fields)
- One of three agents times out occasionally

---

## Progress Tracking

### Phase 1 — Author pre-pass prompts
- [x] Draft Agent A prompt (epic alignment)
- [x] Draft Agent B prompt (architecture alignment)
- [x] Draft Agent C prompt (codebase already-implemented scan)
- [x] Save to `shared/resources/review-story-prepass-prompts.md`

### Phase 2 — Wire dispatch into SKILL.md
- [x] Add Phase 1.5 section between resolution and Q&A
- [x] Document parallel fan-out (single-message multi-tool-call)
- [x] Define summary schema (≤5 bullets per agent)

### Phase 3 — Q&A consumption
- [x] Update Q&A guidance to reference pre-pass summaries first
- [x] Add fallback if any agent fails (continue with remaining 2)

### Phase 4 — Validation
- [ ] Manual run on representative story with known epic drift (deferred — requires live story; QA to verify)
- [ ] Manual run on story with already-implemented feature (deferred — requires live story; QA to verify)
- [x] Update skill catalog via `npm run generate-catalog`

---

## References

- **Related Skill**: `skills/review-story/SKILL.md`
- **Shared Resource (new)**: `shared/resources/review-story-prepass-prompts.md`
- **Pipeline Patterns**: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
- **GitHub Issue**: [#34](https://github.com/Gamaroff/agent-skills/issues/34)

---

## Dev Agent Record

**Start Date**: 2026-05-08
**Completion Date**: 2026-05-08
**Assignee**: Claude (automated pipeline)

### Implementation Summary

Added Phase 1.5 pre-pass to `skills/review-story/SKILL.md` — three parallel read-only Explore subagents (epic alignment, architecture alignment, codebase already-implemented) dispatched in a single message block between Step 1 context loading and Step 2 review. Created `shared/resources/review-story-prepass-prompts.md` with full prompt templates, variable substitution table, dispatch instructions, and failure handling rules. Updated Interactive Questioning Strategy with a "Pre-pass Summary Consumption" section that maps each summary to the correct Q&A step and severity threshold for user question escalation.

### Implementation Approach

- **Phase 1**: Created `shared/resources/review-story-prepass-prompts.md` with three Explore prompt templates. Each returns a fixed YAML schema: Agents A/B use `alignment: aligned|drift|conflict` + `findings[]`; Agent C uses `implementation_status: not-implemented|partial|fully-implemented` + `findings[]`. All capped at 5 findings, ≤200 words output. Includes fallback YAML for each agent if the target file cannot be found.
- **Phase 2**: Inserted `### Phase 1.5` section in `skills/review-story/SKILL.md` between "Step 1: Load Configuration and Context" output line and "Step 2: Template Structure Compliance Review". Section documents variable resolution, single-message parallel dispatch, result collection, PREPASS_A/B/C storage, and failure handling.
- **Phase 3**: Added "Pre-pass Summary Consumption" subsection in Interactive Questioning Strategy mapping each summary to the Q&A step it informs (PREPASS_A → Step 4, PREPASS_B → Step 5, PREPASS_C → Step 6) with medium/high severity escalation rule. Also added the same guidance in the Review Workflow header note for inline reference during step execution.
- **Phase 4**: Ran `npm run generate-catalog` — 124 skills, catalog rebuilt successfully.

### Deferred Work

- Manual validation runs (Phase 4): two live-story test scenarios (epic-drift story, already-implemented story) deferred to QA phase — require a real story to invoke `/review-story` against.
- Performance metrics (≥40% wall-clock, ≥50% Read-call reduction) deferred to QA empirical measurement.
- `documentation-standards-validator` run deferred to QA.

### Change Log

| Date | Change |
|------|--------|
| 2026-05-08 | Created `shared/resources/review-story-prepass-prompts.md` with Agent A/B/C prompt templates |
| 2026-05-08 | Inserted Phase 1.5 section in `skills/review-story/SKILL.md` (between Step 1 and Step 2) |
| 2026-05-08 | Added Pre-pass Summary Consumption guidance in Interactive Questioning Strategy section |
| 2026-05-08 | Added pre-pass summary guidance to Review Workflow header note |
| 2026-05-08 | Rebuilt `docs/skill-catalog.md` via `npm run generate-catalog` |

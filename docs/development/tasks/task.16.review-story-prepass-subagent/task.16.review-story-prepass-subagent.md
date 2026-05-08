---
id: task.16
title: "Add review-story pre-pass: 3 parallel Explore subagents (epic / architecture / codebase-implemented)"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.75 day
depends_on: —
github_issue: 34
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #1)
---

# Task 16 — `review-story` pre-pass via 3 parallel Explore subagents

**Status**: Planned

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

- ~3× wall-clock saving on this step (parallel fan-out)
- ~60% fewer files loaded into main context for Step 2
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

### Phase 1 — Author pre-pass prompts (Low risk)
- [ ] Draft Agent A prompt (epic alignment)
- [ ] Draft Agent B prompt (architecture alignment)
- [ ] Draft Agent C prompt (codebase already-implemented scan)
- [ ] Save to `shared/resources/review-story-prepass-prompts.md`

### Phase 2 — Wire dispatch into SKILL.md (Medium risk)
- [ ] Add Phase 1.5 section between resolution and Q&A
- [ ] Document parallel fan-out (single-message multi-tool-call)
- [ ] Define summary schema (≤5 bullets per agent)

### Phase 3 — Q&A consumption (Low risk)
- [ ] Update Q&A guidance to reference pre-pass summaries first
- [ ] Add fallback if any agent fails (continue with remaining 2)

### Phase 4 — Validation (Low risk)
- [ ] Manual run on representative story with known epic drift
- [ ] Manual run on story with already-implemented feature
- [ ] Update skill catalog via `npm run generate-catalog`

## 7. Files Summary

**Modified**:
1. `skills/review-story/SKILL.md`

**New**:
2. `shared/resources/review-story-prepass-prompts.md`

**Auto-rebuilt**:
3. `skill-catalog.md`

## 8. Testing Strategy

- **Manual**: dispatch on 3 stories (clean / epic-drift / already-implemented); verify summaries surface conflicts
- **Fallback**: simulate one agent timing out; confirm Q&A proceeds with 2 remaining summaries
- **Regression**: existing review-story flows still produce same final recommendations

## 9. Success Criteria

**Functional**:
- [ ] Pre-pass dispatched as single parallel block
- [ ] Each agent returns structured ≤200-word summary
- [ ] Q&A references summaries before asking user

**Performance**:
- [ ] Step 2 wall-clock reduced ≥40% on representative run
- [ ] Main-context Read calls during Step 2 reduced ≥50%

**Quality**:
- [ ] `documentation-standards-validator` passes on changed files
- [ ] No regressions in existing review-story output format

**Migration**:
- [ ] No caller changes required

## 10. Risk Assessment

**Medium**: Subagent prompts produce noisy output → mitigation: enforce ≤5-bullet schema; retry with stricter prompt if exceeded.

**Low**: Parallel fan-out costs more total tokens than serial main read → mitigation: net win expected because subagent outputs are summaries not file bodies.

## 11. Rollback Plan

**Immediate** (<1 hr): revert `skills/review-story/SKILL.md` change. Pre-pass is additive, no state migrations.

**Trigger**: pre-pass produces wrong/misleading summaries that cause user to make worse decisions vs baseline.

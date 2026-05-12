---
id: story.4.3.day-3-messy-path
title: "Story 4.3: Day 3 — Review concerns and QA-gate failures"
type: story
status: draft
priority: medium
epic: 4
epic_file: ../../epic.4.first-week-guided-learning-path.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: null
github_url: null
created: 2026-05-11
updated: 2026-05-11
---

# Story 4.3: Day 3 — Messy path

**Status**: Draft

## Story Statement

**As a** new user on Day 3,
**I want** to deliberately reproduce a QA-gate failure and recover from it,
**so that** the messy path stops being scary.

## Acceptance Criteria

1. `docs/runbooks/first-week/day-3-messy-path.md` exists with frontmatter and checkpoints.
2. Day 3 references the Epic 2.3 worked messy-path artifact (`examples/story-messy-path/`) and walks the user through reproducing a similar shape of failure-and-recovery on their own work.
3. Completion criteria: user has ≥ 1 `qa-gate: FAIL` artifact followed by a `qa-gate: PASS` revision in their repo.
4. Doc body ≤ 300 lines.

## Dev Notes

### Previous Story Insights

- Day 3 is **content-gated on Story 2.3**: it references the messy-path example as its anchor. If Story 2.3 was descoped (no real FAIL captured), Day 3 must use a generic-recipe approach with explicit "we don't have a canonical messy-path example yet" disclaimer.
- Story 4.1 and 4.2 established the day-doc shape.

### File Locations

- **New file:** `docs/runbooks/first-week/day-3-messy-path.md`.
- **Linked:** `examples/story-messy-path/` (Story 2.3, may be descoped), `docs/runbooks/story-development.md`.

### Testing Requirements

- Static validator.
- Walkthrough: produce a real FAIL→PASS pair.

### Manual Testing Steps

**Prerequisites:** completed Day 2; familiar with `/develop-story` chain.

**Verification:**
- AC1: file + checkpoints present.
- AC2: refs Epic 2.3 artifact (or descoped-state disclaimer).
- AC3: user produces FAIL gate then PASS gate on their own story.
- AC4: `wc -l ≤ 300`.

**Edge cases:**
- Forcing a FAIL deliberately is awkward. The day must offer a recipe: e.g., "Create a story whose AC says 'Doc ≤ 50 lines' and intentionally write 100 lines on the first pass — QA will fail, you'll fix and re-run."
- If 2.3 descoped, Day 3 falls back to the generic recipe with no canonical example. Document this branch clearly.

### Rollback Plan

- Simple revert.

### Technical Constraints

- 300-line cap.

### Git History Insights

- N/A — content-driven story.

## Tasks / Subtasks

> Detailed implementation guide: [story.4.3.plan.day-3-messy-path.md](story.4.3.plan.day-3-messy-path.md)

- [ ] **Task 1**: File skeleton (AC: 1)
- [ ] **Task 2**: "Why the messy path?" intro section (AC: 2)
- [ ] **Task 3**: Recipe for inducing a controlled FAIL (AC: 3)
- [ ] **Task 4**: Recovery walkthrough — `qa-fix` loop, revision, second `qa-gate` run (AC: 3)
- [ ] **Task 5**: Link to Epic 2.3 messy-path artifact OR descoped disclaimer (AC: 2)
- [ ] **Task 6**: Walkthrough verification (AC: 3)
- [ ] **Task 7**: Static validation + status flip (AC: 1, 4)

## Testing

Walkthrough + static + link check.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated downstream.)_

### QA Prerequisites Checklist

- [ ] Doc exists with checkpoints
- [ ] Recipe for controlled FAIL is reproducible
- [ ] User produces FAIL→PASS pair during walkthrough
- [ ] Doc ≤ 300 lines
- [ ] Descoped-2.3 branch handled if applicable

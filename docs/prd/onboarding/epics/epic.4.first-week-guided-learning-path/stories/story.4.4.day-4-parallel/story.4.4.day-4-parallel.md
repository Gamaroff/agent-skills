---
id: story.4.4.day-4-parallel
title: "Story 4.4: Day 4 — Parallel work + change management"
type: story
status: draft
priority: medium
epic: 4
epic_file: ../../epic.4.first-week-guided-learning-path.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 87
github_url: https://github.com/Gamaroff/agent-skills/issues/87
created: 2026-05-11
updated: 2026-05-11
---

# Story 4.4: Day 4 — Parallel work + change management

**Status**: Draft

## Story Statement

**As a** new user on Day 4,
**I want** to try parallel stories and the change-management runbook,
**so that** I am equipped for week-2+ scenarios.

## Acceptance Criteria

1. `docs/runbooks/first-week/day-4-parallel.md` exists with frontmatter and checkpoints.
2. Day 4 cross-links to `parallel-stories.md` and `change-management.md` (both with Epic 3.2 callouts in place).
3. Completion criteria: user has either (a) two stories in parallel worktrees OR (b) one change-management Sprint Change Proposal in their repo.
4. Doc body ≤ 300 lines.

## Dev Notes

### Previous Story Insights

- Day 1–3 pattern locked in.
- Day 4 is optional after Day 2 (per parent Epic IV3 in Story 4.4) — it does NOT require Day 3 to be completed.

### File Locations

- **New file:** `docs/runbooks/first-week/day-4-parallel.md`.
- **Linked:** `docs/runbooks/parallel-stories.md`, `docs/runbooks/change-management.md`.

### Testing Requirements

- Static validator.
- Walkthrough: complete one of (a) or (b).

### Manual Testing Steps

**Verification:**
- AC1: file + checkpoints.
- AC2: refs both runbooks; Epic 3.2 callouts on those runbooks land independently.
- AC3: user completes (a) OR (b); both paths documented.
- AC4: `wc -l ≤ 300`.

**Edge cases:**
- Parallel worktrees require `git worktree` familiarity. Day 4 must give a 1-paragraph primer.
- Sprint Change Proposal is a structured doc — Day 4 references `change-checklist` skill for the template.

### Rollback / Constraints

Standard simple-revert. 300-line cap.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.4.4.plan.day-4-parallel.md](story.4.4.plan.day-4-parallel.md)

- [ ] **Task 1**: File skeleton (AC: 1)
- [ ] **Task 2**: Branch (a) — parallel stories walkthrough (AC: 2, 3)
- [ ] **Task 3**: Branch (b) — change-management walkthrough (AC: 2, 3)
- [ ] **Task 4**: `git worktree` primer (AC: 2)
- [ ] **Task 5**: Walkthrough verification — complete one branch (AC: 3)
- [ ] **Task 6**: Static validation + status flip (AC: 1, 4)

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
- [ ] Both branches (a, b) documented
- [ ] User completes one branch during verification
- [ ] Doc ≤ 300 lines
- [ ] `git worktree` primer present

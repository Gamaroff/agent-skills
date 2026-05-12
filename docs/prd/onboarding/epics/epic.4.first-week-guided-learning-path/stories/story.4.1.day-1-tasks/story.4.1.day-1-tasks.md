---
id: story.4.1.day-1-tasks
title: "Story 4.1: Day 1 — Tasks"
type: story
status: draft
priority: high
epic: 4
epic_file: ../../epic.4.first-week-guided-learning-path.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 89
github_url: https://github.com/Gamaroff/agent-skills/issues/89
created: 2026-05-11
updated: 2026-05-11
---

# Story 4.1: Day 1 — Tasks

**Status**: Draft

## Story Statement

**As a** new user on Day 1,
**I want** a guided checklist that walks me through running 2–3 tasks,
**so that** I internalize the task pipeline before tackling the story pipeline.

## Acceptance Criteria

1. `docs/runbooks/first-week/day-1-tasks.md` exists with frontmatter and checkpoint-style checklist (boxes the user ticks).
2. Day 1 spans the task quickstart (Story 1.1 output) plus 2 follow-up tasks of progressive complexity.
3. Completion criteria measurable: by end of Day 1, user has 3 task artifact sets in their working repo.
4. Doc body ≤ 300 lines.

## Dev Notes

### Previous Story Insights

- Story 1.1 (`quickstart-task.md`) is Day 1's primary reference. Sequence 4.1 after 1.1.
- Day docs use checkpoint pattern (markdown checkboxes) — user reads and ticks.

### File Locations

- **New file:** `docs/runbooks/first-week/day-1-tasks.md`. (Directory `docs/runbooks/first-week/` is created by this story — first file in it.)
- **Linked:** `docs/concepts/quickstart-task.md` (Story 1.1), `docs/runbooks/task-development.md`.

### Testing Requirements

- Static validator.
- Walkthrough test: complete the day on a clean clone; record elapsed time.
- Link check.

### Manual Testing Steps

**Prerequisites:** clean clone, Node ≥ 20, having NOT yet completed Story 1.1 quickstart (Day 1 includes it).

**Verification steps:**
- **AC1:** file exists; frontmatter valid; ≥ 1 checkbox in body.
- **AC2:** doc references `quickstart-task.md` and proposes 2 follow-up tasks with progressive complexity.
- **AC3:** completing the day produces 3 task artifact sets under `docs/tasks/`.
- **AC4:** `wc -l ≤ 300`.

**Edge cases:**
- Two follow-up tasks must be self-contained — no external dependencies that could break the day. Recommend: (a) "Update CONTRIBUTING.md to link the new quickstart-task.md", (b) "Add a status badge to README.md" — both small, repo-local.
- Day 1 is the user's introduction. AskUserQuestion prompts must be pre-warned even more aggressively than in the quickstart.

### Rollback Plan

- **What to revert:** `docs/runbooks/first-week/day-1-tasks.md` and parent directory if no other day files exist.
- **Revert steps:** revert PR.
- **Impact:** users without Day 1 fall back to ad-hoc exploration.
- **Rollback complexity:** Simple.

### Technical Constraints

- 300-line cap (AC4).
- All 3 tasks must complete in ≤ 1 working day (~4 hours) for a new user — informal time budget.

### Git History Insights

- Same as Story 1.1 — Node ≥ 20, post-`docs/tasks/` migration.

### Project Structure Notes

- Creating `docs/runbooks/first-week/` as a new subdirectory under runbooks. Hub file `docs/runbooks/first-week.md` is Story 4.5's responsibility — Day 1 doesn't update it.

## Tasks / Subtasks

> Detailed implementation guide: [story.4.1.plan.day-1-tasks.md](story.4.1.plan.day-1-tasks.md)

- [ ] **Task 1**: Create `docs/runbooks/first-week/` directory + file skeleton + frontmatter (AC: 1)
- [ ] **Task 2**: Author "Hour 1: quickstart" section pointing at Story 1.1 output (AC: 2)
- [ ] **Task 3**: Author "Hour 2: follow-up task 1" with concrete task description (AC: 2)
- [ ] **Task 4**: Author "Hour 3–4: follow-up task 2" — slightly more complex (AC: 2)
- [ ] **Task 5**: Author "End of day: verify 3 artifact sets" checklist (AC: 3)
- [ ] **Task 6**: Walkthrough verification on macOS (AC: 3)
- [ ] **Task 7**: Static validation + line count + status flip (AC: 1, 4)

## Testing

- Walkthrough is the integration test.
- Static + link check supplement.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated downstream.)_

### QA Prerequisites Checklist

- [ ] Doc exists with checkpoints
- [ ] Day completes in ≤ 4 hours wall time on macOS
- [ ] User has 3 task artifact sets after completion
- [ ] Doc ≤ 300 lines
- [ ] All links resolve

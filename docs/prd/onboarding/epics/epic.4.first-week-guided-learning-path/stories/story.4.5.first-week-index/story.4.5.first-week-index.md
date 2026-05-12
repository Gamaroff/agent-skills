---
id: story.4.5.first-week-index
title: "Story 4.5: First-week index"
type: story
status: draft
priority: medium
epic: 4
epic_file: ../../epic.4.first-week-guided-learning-path.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 86
github_url: https://github.com/Gamaroff/agent-skills/issues/86
created: 2026-05-11
updated: 2026-05-11
---

# Story 4.5: First-week index

**Status**: Draft

## Story Statement

**As a** new user planning their onboarding,
**I want** a single index page listing the four days with completion criteria,
**so that** I can plan my week.

## Acceptance Criteria

1. `docs/runbooks/first-week.md` exists at runbook level (NOT nested in `first-week/`).
2. Index lists Day 1–Day 4 with one-line description AND one-line completion criterion each.
3. Index links to all four day docs AND to the relevant Epic 1 quickstarts.
4. Doc body ≤ 100 lines.

## Dev Notes

### Previous Story Insights

- All 4 day docs (Stories 4.1–4.4) must exist before this story develops, since this is the hub.
- `docs/runbooks/README.md` is the runbook hub — this story adds a single inbound link from it to `first-week.md`. The README is otherwise untouched.

### File Locations

- **New file:** `docs/runbooks/first-week.md`.
- **Modified:** `docs/runbooks/README.md` (single inbound link).
- **Linked:** `first-week/day-1-tasks.md`, `first-week/day-2-stories.md`, `first-week/day-3-messy-path.md`, `first-week/day-4-parallel.md`, `docs/concepts/quickstart-task.md`, `docs/concepts/quickstart-story.md`.

### Testing Requirements

- Static validator.
- Link check (6 outbound links + 1 inbound from runbooks/README.md).
- Diff inspection of `runbooks/README.md`: insertion-only.

### Manual Testing Steps

**Verification:**
- AC1: file at `docs/runbooks/first-week.md` exists; NOT nested.
- AC2: 4 rows (Day 1–4); each has description + criterion.
- AC3: 6 outbound links resolve.
- AC4: `wc -l ≤ 100`.

**Edge cases:**
- If `docs/runbooks/README.md` already has a "First week" mention from prior work, deduplicate — single inbound link.

### Rollback / Constraints

Simple revert. 100-line cap.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.4.5.plan.first-week-index.md](story.4.5.plan.first-week-index.md)

- [ ] **Task 1**: File skeleton + frontmatter (AC: 1)
- [ ] **Task 2**: Day-1–Day-4 table with description + completion criterion (AC: 2)
- [ ] **Task 3**: "Before you start" preamble linking quickstarts (AC: 3)
- [ ] **Task 4**: "After the week" outro pointing at runbook anchors (AC: 3)
- [ ] **Task 5**: Insert single inbound link in `docs/runbooks/README.md` (AC: 3)
- [ ] **Task 6**: Diff verify README change is insertion-only (AC: pre-existing structure preserved)
- [ ] **Task 7**: Static validation + line count + link check + status flip (AC: 1, 4)

## Testing

Static + link check + diff inspection.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated downstream.)_

### QA Prerequisites Checklist

- [ ] Index file exists at correct path (NOT nested)
- [ ] 4 day-rows present with description + criterion
- [ ] All 6 outbound links resolve
- [ ] runbooks/README.md modification is insertion-only (diff verified)
- [ ] Doc ≤ 100 lines

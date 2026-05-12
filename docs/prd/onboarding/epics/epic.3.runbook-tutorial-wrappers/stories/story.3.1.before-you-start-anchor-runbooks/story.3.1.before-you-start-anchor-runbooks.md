---
id: story.3.1.before-you-start-anchor-runbooks
title: "Story 3.1: 'Before you start' for anchor runbooks"
type: story
status: draft
priority: high
epic: 3
epic_file: ../../epic.3.runbook-tutorial-wrappers.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: null
github_url: null
created: 2026-05-11
updated: 2026-05-11
---

# Story 3.1: "Before you start" for anchor runbooks

**Status**: Draft

## Story Statement

**As a** new user opening `story-development.md` or `task-development.md` cold,
**I want** a prerequisite section at the top telling me what to know first,
**so that** I do not bounce off the 274-line body.

## Acceptance Criteria

1. Both `docs/runbooks/story-development.md` and `docs/runbooks/task-development.md` gain a "Before you start" section between the title and the existing body.
2. Each section lists: (a) which quickstart to do first, (b) which standards docs to skim, (c) when to use a different runbook instead.
3. Each section ≤ 30 lines.
4. Existing body content is character-identical to pre-change.

## Dev Notes

### Previous Story Insights

Independent epic — no prior-story dependencies. References Epic 1 quickstarts (Stories 1.1, 1.2) as link targets; if those haven't merged, links resolve once they do.

### File Locations

- **Modified:** `docs/runbooks/story-development.md`, `docs/runbooks/task-development.md`. [Source: live tree.]
- **Linked:** `docs/concepts/quickstart-task.md`, `docs/concepts/quickstart-story.md`, `docs/concepts/which-path.md`, `docs/standards/`.

### Testing Requirements

- Static validator.
- **Diff inspection:** existing body character-identical. Any diff outside the inserted "Before you start" section is a FAIL.
- Link check.

### Manual Testing Steps

**Verification steps:**
- **AC1:** scan both files for new "## Before you start" heading near top.
- **AC2:** each section lists 3 elements (quickstart, standards, alt-runbook).
- **AC3:** `wc -l` of each new section ≤ 30.
- **AC4:** `git diff` shows only insertions; existing lines unchanged. Confirm via `git diff --stat` line counts.

**Edge cases:**
- Both runbooks may have intro paragraphs already. Insert AFTER the title and BEFORE the intro — do not displace existing intro content.

### Rollback Plan

- **What to revert:** edits to both runbook files.
- **Revert steps:** revert PR.
- **Impact:** runbooks return to cold-entry state.
- **Rollback complexity:** Simple.

### Technical Constraints

- 30-line cap per section (AC3).
- Body untouched (AC4) — hard constraint, gating.

### Git History Insights

- Anchor runbooks haven't been heavily edited recently — low merge-conflict risk.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.3.1.plan.before-you-start-anchor-runbooks.md](story.3.1.plan.before-you-start-anchor-runbooks.md)

- [ ] **Task 1**: Snapshot both runbooks (pre-edit) for diff comparison (AC: 4)
- [ ] **Task 2**: Draft "Before you start" content for `story-development.md` ≤ 30 lines (AC: 1, 2, 3)
- [ ] **Task 3**: Insert into `story-development.md` between title and body (AC: 1)
- [ ] **Task 4**: Draft + insert "Before you start" for `task-development.md` ≤ 30 lines (AC: 1, 2, 3)
- [ ] **Task 5**: Diff verification — existing body character-identical (AC: 4)
- [ ] **Task 6**: Static validation + link check + status flip (AC: all)

## Testing

- Diff inspection (gating) + static validator + link check.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated downstream.)_

### QA Prerequisites Checklist

- [ ] Both runbooks have "Before you start" sections
- [ ] Each section ≤ 30 lines
- [ ] Existing body character-identical (diff verified)
- [ ] All outbound links resolve

---
id: story.3.3.common-first-time-errors
title: "Story 3.3: 'Common first-time errors' troubleshooting sections"
type: story
status: draft
priority: medium
epic: 3
epic_file: ../../epic.3.runbook-tutorial-wrappers.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 80
github_url: https://github.com/Gamaroff/agent-skills/issues/80
created: 2026-05-11
updated: 2026-05-11
---

# Story 3.3: "Common first-time errors" troubleshooting sections

**Status**: Draft

## Story Statement

**As a** new user hitting a confusing error during a runbook walkthrough,
**I want** a troubleshooting section at the end of the anchor runbooks,
**so that** I can self-serve before asking for help.

## Acceptance Criteria

1. Both anchor runbooks (`story-development.md`, `task-development.md`) gain a "Common first-time errors" section at the end.
2. Each section lists ≥ 5 errors with symptom, cause, fix.
3. Errors sourced from **real friction** observed during this PRD's dogfood run — record them as encountered. No invented entries.
4. Each section ≤ 60 lines.

## Dev Notes

### Previous Story Insights

- Story 3.3 is **observation-gated**: it requires real error friction to have been recorded by the time this story is developed.
- The earlier Epic 1, 2, 4 develop-story runs are the natural source — implementation reports are likely to log error events.
- If < 5 real errors observed per runbook, document the gap honestly: "Only N errors observed during dogfood run; placeholders for the remainder are acceptable as long as marked `(speculative — confirm in future runs)`."

### File Locations

- **Modified:** `docs/runbooks/story-development.md`, `docs/runbooks/task-development.md`. [Source: live tree.]

### Testing Requirements

- Static validator.
- Diff inspection: existing body untouched, section appended at end.
- Provenance verification per error: each error must trace to an implementation report or a real commit SHA.

### Manual Testing Steps

**Verification steps:**
- **AC1:** scan both runbooks for "## Common first-time errors" near end.
- **AC2:** count error entries per section ≥ 5 (or fewer with `(speculative)` markers).
- **AC3:** for each non-speculative error, point to the implementation report or PR comment that surfaced it.
- **AC4:** `wc -l` per section ≤ 60.

**Edge cases:**
- Errors observed across both pipelines (task + story) may overlap. Cross-reference, don't duplicate.

### Rollback Plan

- **What to revert:** edits to both runbooks.
- **Revert steps:** revert PR.
- **Impact:** users without troubleshooting fall back to asking in issues.
- **Rollback complexity:** Simple.

### Technical Constraints

- 60-line cap per section.
- Provenance required for non-speculative entries.

### Git History Insights

- Watch `develop-story` and `develop-task` implementation reports from the Epic 1, 2, 4 runs — they record AskUserQuestion prompts, QA-fix loops, and Phase 0 errors.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.3.3.plan.common-first-time-errors.md](story.3.3.plan.common-first-time-errors.md)

- [ ] **Task 1**: Survey implementation reports from prior dogfood stories for error events (AC: 3)
- [ ] **Task 2**: Categorise findings — task-pipeline-specific, story-pipeline-specific, both (AC: 3)
- [ ] **Task 3**: Draft "Common first-time errors" for `task-development.md` ≥ 5 entries ≤ 60 lines (AC: 1, 2, 4)
- [ ] **Task 4**: Draft "Common first-time errors" for `story-development.md` ≥ 5 entries ≤ 60 lines (AC: 1, 2, 4)
- [ ] **Task 5**: Append to both runbooks (AC: 1)
- [ ] **Task 6**: Provenance trace per non-speculative entry (AC: 3)
- [ ] **Task 7**: Diff verification (body above the new section untouched) + static validator (AC: all)

## Testing

- Diff inspection (gating).
- Provenance verification per entry.
- Static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated downstream.)_

### QA Prerequisites Checklist

- [ ] Both runbooks have troubleshooting sections
- [ ] Each section ≥ 5 entries (or speculative markers documented)
- [ ] Each entry has provenance (commit SHA or implementation report link)
- [ ] Each section ≤ 60 lines
- [ ] Existing body untouched (diff verified)

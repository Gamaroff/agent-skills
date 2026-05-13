---
id: story.3.2.satellite-runbook-callouts
title: "Story 3.2: 'Is this the right runbook?' callouts for satellites"
type: story
status: draft
priority: high
epic: 3
epic_file: ../../epic.3.runbook-tutorial-wrappers.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 81
github_url: https://github.com/Gamaroff/agent-skills/issues/81
created: 2026-05-11
updated: 2026-05-11
---

# Story 3.2: "Is this the right runbook?" callouts for satellites

**Status**: Draft

## Story Statement

**As a** new user landing on `hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, or `change-management.md`,
**I want** a top-of-page callout that confirms (or redirects) my path,
**so that** I do not follow a runbook that does not match my situation.

## Acceptance Criteria

1. Each of the four satellite runbooks gains a callout block at the top: "Use this if X. Use [Y runbook] instead if Z."
2. Callouts cross-reference `which-path.md` (Story 1.3 output).
3. Each callout ≤ 10 lines.
4. Existing body untouched.

## Dev Notes

### Previous Story Insights

- Story 3.1 established the diff-inspection gate pattern for runbook augmentation. Reuse.
- Story 1.3 (which-path.md) is the cross-reference target. If 1.3 not yet landed, leave the link in place — markdown link checker tolerates if directory exists.

### File Locations

- **Modified:** `docs/runbooks/hotfix.md`, `docs/runbooks/bug-fix.md`, `docs/runbooks/create-parallel-stories.md`, `docs/runbooks/change-management.md`. [Source: live tree.]
- **Linked:** `docs/concepts/which-path.md` (Story 1.3 output).

### Testing Requirements

- Static validator.
- Diff inspection (4 files, all body content unchanged).
- Link check.

### Manual Testing Steps

**Verification steps:**
- **AC1:** each of the 4 files has a callout block immediately after the title.
- **AC2:** each callout references `which-path.md`.
- **AC3:** each callout ≤ 10 lines.
- **AC4:** `git diff` shows insertions only.

**Edge cases:**
- Callout wording varies per runbook (hotfix is "broken in prod NOW"; parallel is "multiple streams"). Template parameterised but content-specific.

### Rollback Plan

- **What to revert:** 4 file edits.
- **Revert steps:** revert PR.
- **Impact:** satellites return to unguarded state.
- **Rollback complexity:** Simple.

### Technical Constraints

- 10-line cap per callout (AC3).
- Body untouched (AC4) — gating.

### Git History Insights

- Satellite runbooks haven't been touched recently. Safe to insert.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.3.2.plan.satellite-runbook-callouts.md](story.3.2.plan.satellite-runbook-callouts.md)

- [ ] **Task 1**: Snapshot all 4 satellites for diff comparison (AC: 4)
- [ ] **Task 2**: Draft 4 callouts (parameterised per runbook) ≤ 10 lines each (AC: 1, 2, 3)
- [ ] **Task 3**: Insert into each file (AC: 1)
- [ ] **Task 4**: Diff verification × 4 (AC: 4)
- [ ] **Task 5**: Static validation + link check + status flip (AC: all)

## Testing

- Diff inspection (gating, ×4) + static validator + link check.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated downstream.)_

### QA Prerequisites Checklist

- [ ] All 4 satellite runbooks have callouts
- [ ] Each callout ≤ 10 lines
- [ ] Each callout references `which-path.md`
- [ ] All 4 diffs show insertions only

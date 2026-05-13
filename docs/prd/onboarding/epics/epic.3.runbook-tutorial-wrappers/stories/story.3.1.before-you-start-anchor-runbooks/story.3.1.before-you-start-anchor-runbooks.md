---
id: story.3.1.before-you-start-anchor-runbooks
title: "Story 3.1: 'Before you start' for anchor runbooks"
type: story
status: accepted
priority: high
epic: 3
epic_file: ../../epic.3.runbook-tutorial-wrappers.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 79
github_url: https://github.com/Gamaroff/agent-skills/issues/79
pr_number: 107
created: 2026-05-11
updated: 2026-05-13
completed_date: 2026-05-13
---

# Story 3.1: "Before you start" for anchor runbooks

**Status**: Accepted
**Review**: ✅ All review recommendations from `story.3.1.review.1.before-you-start-anchor-runbooks.md` implemented 2026-05-13
**GitHub Issue**: [#79](https://github.com/Gamaroff/agent-skills/issues/79)

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

- [x] **Task 1**: Snapshot both runbooks (pre-edit) for diff comparison (AC: 4)
- [x] **Task 2**: Draft "Before you start" content for `story-development.md` ≤ 30 lines (AC: 1, 2, 3)
- [x] **Task 3**: Insert into `story-development.md` between title and body (AC: 1)
- [x] **Task 4**: Draft + insert "Before you start" for `task-development.md` ≤ 30 lines (AC: 1, 2, 3)
- [x] **Task 5**: Diff verification — existing body character-identical (AC: 4)
- [x] **Task 6**: Static validation + link check + status flip (AC: all)

## Testing

- Diff inspection (gating) + static validator + link check.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-13 | 1.1     | Review passed (9/10) — ready for development | review-story |
| 2026-05-13 | 1.2     | Implemented — "Before you start" sections inserted in both runbooks | dev-agent |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

### Implementation Summary

Inserted a "Before you start" prerequisite section into both anchor runbooks. Each section is 21 lines (well under the 30-line cap), lists the relevant quickstart, three standards docs to skim, and a "use a different runbook instead if" list with self-reference removed. All 4 ACs pass: sections present (AC1), 3-element checklist (AC2), 21 ≤ 30 lines (AC3), zero deleted lines (AC4). All linked files verified to exist.

### Start Date

2026-05-13

### Completion Date

2026-05-13

### Implementation Approach

- **Task 1**: Snapshot line counts (story-development.md=274, task-development.md=183) — used as diff baseline
- **Tasks 2–3**: Drafted and inserted "Before you start" section into `story-development.md` after title, before intro paragraph. References quickstart-story, epic-registry, task-development, hotfix, create-parallel-stories, which-path.
- **Task 4**: Drafted and inserted equivalent section into `task-development.md`. Self-reference to task-development removed from "use different runbook" list; replaced with story-development forward-ref.
- **Task 5**: Diff verified — `git diff | grep "^-"` returned zero deleted lines. Pure insertions only.
- **Task 6**: Section line counts = 21 each (AC3 pass). All 8 linked files resolved on disk (AC2, link check pass).

### Testing Results

All ACs verified:
- AC1: "## Before you start" heading present in both files ✅
- AC2: Each section contains quickstart link + 3 standards links + alt-runbook list ✅
- AC3: 21 lines per section ≤ 30 ✅
- AC4: Zero deleted lines in git diff ✅
- Link check: all 8 target files exist ✅

### File List

**Modified:**
- `docs/runbooks/story-development.md` — inserted "Before you start" section (21 lines)
- `docs/runbooks/task-development.md` — inserted "Before you start" section (21 lines)
- `docs/prd/onboarding/epics/epic.3.runbook-tutorial-wrappers/stories/story.3.1.before-you-start-anchor-runbooks/story.3.1.before-you-start-anchor-runbooks.md` — status updated, tasks checked off, Dev Agent Record populated

### QA Prerequisites Checklist

- [x] Both runbooks have "Before you start" sections
- [x] Each section ≤ 30 lines
- [x] Existing body character-identical (diff verified)
- [x] All outbound links resolve

### QA Results

**QA #1**: PASS (2026-05-13)
- Report: [`story.3.1.qa.1.before-you-start-anchor-runbooks.md`](story.3.1.qa.1.before-you-start-anchor-runbooks.md)
- Gate: [`story.3.1.gate.1.before-you-start-anchor-runbooks.yml`](story.3.1.gate.1.before-you-start-anchor-runbooks.yml)
- Quality score: 100/100 — no issues found

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `story.3.1.qa.1.before-you-start-anchor-runbooks.md`
**Gate File**: `story.3.1.gate.1.before-you-start-anchor-runbooks.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria verified:

✅ **AC1**: "## Before you start" section inserted in both runbooks (line 3 each)
✅ **AC2**: Each section lists quickstart + 3 standards docs + alt-runbook list (11 links total, all resolving)
✅ **AC3**: 20 lines per section — under 30-line cap
✅ **AC4**: Zero deleted lines in git diff — existing body character-identical
✅ **Link integrity**: All 11 outbound links resolve on disk
✅ **Security**: NOT_APPLICABLE (docs-only, no code)
✅ **Compliance**: File naming and story conventions compliant

**Story marked as ACCEPTED on:** 2026-05-13
**Detailed Verification Log:** See [`story.3.1.dod.1.before-you-start-anchor-runbooks.md`](story.3.1.dod.1.before-you-start-anchor-runbooks.md) for complete verification evidence.

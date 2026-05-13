---
id: story.4.5.first-week-index
title: "Story 4.5: First-week index"
type: story
status: accepted
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

**Status**: Accepted
**Review**: ✅ All review recommendations from `story.4.5.review.1.first-week-index.md` implemented 2026-05-13
**GitHub Issue**: [#86](https://github.com/Gamaroff/agent-skills/issues/86)

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

- [x] **Task 1**: File skeleton + frontmatter (AC: 1)
- [x] **Task 2**: Day-1–Day-4 table with description + completion criterion (AC: 2)
- [x] **Task 3**: "Before you start" preamble linking quickstarts (AC: 3)
- [x] **Task 4**: "After the week" outro pointing at runbook anchors (AC: 3)
- [x] **Task 5**: Insert single inbound link in `docs/runbooks/README.md` (AC: 3). Idempotent — if a `first-week` link already exists, skip insertion.
- [x] **Task 6**: Diff verify README change is insertion-only (AC: 3 — quality gate)
- [x] **Task 7**: Static validation + line count + link check + status flip (AC: 1, 4)

## Testing

Static + link check + diff inspection.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-13 | 1.1     | Review fixes: body GitHub link, Task 5/6 polish, split downstream sections | review-story |
| 2026-05-13 | 1.2     | Review passed - ready for development | review-story |
| 2026-05-13 | 1.3     | Implementation complete — first-week.md created, README.md updated | develop |
| 2026-05-13 | 1.4     | QA PASS (95/100) — all 4 ACs verified, story accepted | qa-story |

## Dev Agent Record

**Start Date**: 2026-05-13
**Completion Date**: 2026-05-13

### Implementation Summary

Created `docs/runbooks/first-week.md` — a 34-line hub index listing all four onboarding day runbooks with one-line descriptions and completion criteria. Added a single inbound link from `docs/runbooks/README.md` (insertion-only, verified by diff). All 6 outbound links verified on disk.

### Implementation Approach

- **Task 1 + Frontmatter**: File created with YAML frontmatter following existing day-doc convention (`name`, `description`, `type: guide`, `status`, `version`, `created`).
- **Task 2 — Day table**: Pulled descriptions from each day doc's YAML `description` field; derived one-line completion criteria from each day's "End of day — Verify" section.
- **Task 3 — Preamble**: "Before you start" section with two quickstart links (`../concepts/quickstart-task.md`, `../concepts/quickstart-story.md`).
- **Task 4 — Outro**: Single sentence pointing to the full runbook index.
- **Task 5 — README inbound link**: Idempotent insertion at top of Available Runbooks table (no pre-existing first-week mention, confirmed by grep).
- **Task 6 — Diff verify**: `git diff docs/runbooks/README.md` shows one `+` line only, zero `-` lines — insertion-only confirmed.
- **Task 7 — Validation**: `wc -l = 34` (≤100 ✅); all 7 links resolved on disk ✅.

### Testing Results

Static + link check: 7/7 links pass. Line count: 34/100 limit. Diff: insertion-only (0 deletions).

### File List

- **Created**: `docs/runbooks/first-week.md`
- **Modified**: `docs/runbooks/README.md` (1 row added to Available Runbooks table)
- **Modified**: `docs/prd/onboarding/epics/epic.4.first-week-guided-learning-path/stories/story.4.5.first-week-index/story.4.5.first-week-index.md` (status + task checkboxes)

### Change Log

| Date | Change |
|------|--------|
| 2026-05-13 | Created `docs/runbooks/first-week.md` with hub index content |
| 2026-05-13 | Added First-Week Onboarding row to `docs/runbooks/README.md` |

## QA Handoff Notes

**What was built**: `docs/runbooks/first-week.md` — hub index at runbook level (NOT nested).

**Verification checklist**:
- AC1: `ls docs/runbooks/first-week.md` exists (NOT in `first-week/`)
- AC2: Table has 4 rows (Day 1–4) each with description + completion criterion
- AC3: 6 outbound links resolve (`first-week/day-{1-4}-*.md`, `../concepts/quickstart-{task,story}.md`) + README inbound link present
- AC4: `wc -l docs/runbooks/first-week.md` → 34 (≤100)

## QA Report

**QA #1**: [`story.4.5.qa.1.first-week-index.md`](story.4.5.qa.1.first-week-index.md)
**Gate**: [`story.4.5.gate.1.first-week-index.yml`](story.4.5.gate.1.first-week-index.yml) — **PASS** (95/100)
**Date**: 2026-05-13

| AC | Result |
|----|--------|
| AC1: file at runbook level (not nested) | ✅ PASS |
| AC2: 4 Day rows with description + criterion | ✅ PASS |
| AC3: 6 outbound + 1 inbound links resolve | ✅ PASS |
| AC4: 34 lines ≤ 100 | ✅ PASS |

No issues found.

## Bug Reports

_(None — QA PASS with no issues.)_

### QA Prerequisites Checklist

- [x] Index file exists at correct path (NOT nested)
- [x] 4 day-rows present with description + criterion
- [x] All 6 outbound links resolve
- [x] runbooks/README.md modification is insertion-only (diff verified)
- [x] Doc ≤ 100 lines

---
id: story.3.3.common-first-time-errors
title: "Story 3.3: 'Common first-time errors' troubleshooting sections"
type: story
status: accepted
priority: medium
epic: 3
epic_file: ../../epic.3.runbook-tutorial-wrappers.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 80
github_url: https://github.com/Gamaroff/agent-skills/issues/80
created: 2026-05-11
updated: 2026-05-13
completed_date: 2026-05-13
pr_number: 109
---

# Story 3.3: "Common first-time errors" troubleshooting sections

**Status**: Accepted
**GitHub Issue**: [#80](https://github.com/Gamaroff/agent-skills/issues/80)
**Review**: ✅ All review recommendations from `story.3.3.review.1.common-first-time-errors.md` implemented 2026-05-13

## Story Statement

**As a** new user hitting a confusing error during a runbook walkthrough,
**I want** a troubleshooting section at the end of the anchor runbooks,
**so that** I can self-serve before asking for help.

## Acceptance Criteria

1. Both anchor runbooks (`story-development.md`, `task-development.md`) gain a "Common first-time errors" section at the end.
2. Each section lists ≥ 5 errors with symptom, cause, fix.
3. Errors sourced from **real friction** observed during this PRD's dogfood run. If fewer than 5 real errors are observed per runbook, the remainder may be filled with `(speculative — confirm in future runs)` markers; entries without that marker must be real.
4. Each section ≤ 60 lines.

## Dev Notes

### Previous Story Insights

- Story 3.3 is **observation-gated**: it requires real error friction to have been recorded by the time this story is developed.
- The earlier Epic 1, 2, 4 develop-story runs are the natural source — implementation reports are likely to log error events.
- If < 5 real errors observed per runbook, document the gap honestly: "Only N errors observed during dogfood run; placeholders for the remainder are acceptable as long as marked `(speculative — confirm in future runs)`."

### File Locations

- **Modified:** `docs/runbooks/story-development.md`, `docs/runbooks/task-development.md`. [Source: live tree.]

### Testing Requirements

- `documentation-standards-validator`.
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

- [x] **Task 1**: Survey implementation reports from prior dogfood stories for error events (AC: 3)
- [x] **Task 2**: Categorise findings — task-pipeline-specific, story-pipeline-specific, both (AC: 3)
- [x] **Task 3**: Draft "Common first-time errors" for `task-development.md` ≥ 5 entries ≤ 60 lines (AC: 1, 2, 4)
- [x] **Task 4**: Draft "Common first-time errors" for `story-development.md` ≥ 5 entries ≤ 60 lines (AC: 1, 2, 4)
- [x] **Task 5**: Append to both runbooks (AC: 1)
- [x] **Task 6**: Provenance trace per non-speculative entry (AC: 3)
- [x] **Task 7**: Diff verification (body above the new section untouched) + static validator (AC: all)

## Testing

- Diff inspection (gating).
- Provenance verification per entry.
- `documentation-standards-validator`.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-13 | 1.1     | Review pass: AC3 speculative allowance, body link, validator named | review-story  |
| 2026-05-13 | 1.2     | Implementation: sections appended to both runbooks; all tasks complete | dev-agent |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

**Implementation Summary:** Appended "Common first-time errors" troubleshooting sections to both anchor runbooks (`story-development.md`, `task-development.md`). Each section contains 5 entries sourced from dogfood run implementation reports.

**Start Date:** 2026-05-13
**Completion Date:** 2026-05-13

**Implementation Approach:**
- Surveyed 11 implementation reports across Epics 1–3 using Explore subagent; found 6 friction events (all from story pipeline: context compaction pause, missing develop branch, stale lock file, step-4-Done-but-no-PR, CHANGELOG.md missing, mid-pipeline scope change).
- Categorised: 5 events applicable to story pipeline only (unique context); 4 events applicable to both pipelines (shared orchestrator mechanism); 1 speculative for task pipeline (registry conflict).
- `story-development.md`: 5 real entries, 53 lines.
- `task-development.md`: 4 real entries (cross-referenced from story pipeline with provenance note) + 1 speculative (marked), 54 lines.
- Both sections appended at end of each file; diff verified purely additive (no existing body modified).

**Testing Results:** N/A — docs-only. Diff inspection and line count verification passed. Provenance trace verified for all non-speculative entries.

**File List:**
- Modified: `docs/runbooks/story-development.md`
- Modified: `docs/runbooks/task-development.md`
- Modified: `docs/prd/onboarding/epics/epic.3.runbook-tutorial-wrappers/stories/story.3.3.common-first-time-errors/story.3.3.common-first-time-errors.md`

**Notes:** Mid-pipeline scope change (Story 2.2) excluded — not clearly user-facing confusion; only 5 real entries needed.

**Deferred Work:** None.

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.3.3.qa.1.common-first-time-errors.md](./story.3.3.qa.1.common-first-time-errors.md)
- **Gate File**: [story.3.3.gate.1.common-first-time-errors.yml](./story.3.3.gate.1.common-first-time-errors.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues. All ACs verified; implementation additive-only with provenance on all real entries.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `story.3.3.qa.1.common-first-time-errors.md`
**Gate File**: `story.3.3.gate.1.common-first-time-errors.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria verified:

✅ **Acceptance Criteria:** All 4 criteria met — both runbooks have troubleshooting sections (53/54 lines), 5+ entries each, provenance verified, speculative entry marked
✅ **PR:** PR #109 open with all changes committed
✅ **Documentation:** Story Change Log current; Dev Agent Record complete; all artifacts co-located
✅ **Security:** ✅ PASS — docs-only, no credentials, no malicious content
✅ **Reliability:** ✅ PASS — provenance links to stable implementation reports
✅ **Maintainability:** ✅ PASS — speculative entry marked for future confirmation

**Detailed Verification Log:** See `story.3.3.dod.1.common-first-time-errors.md`

**Story marked as ACCEPTED on:** 2026-05-13

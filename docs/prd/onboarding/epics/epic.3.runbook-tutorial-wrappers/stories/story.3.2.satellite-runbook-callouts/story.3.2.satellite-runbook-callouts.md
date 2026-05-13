---
id: story.3.2.satellite-runbook-callouts
title: "Story 3.2: 'Is this the right runbook?' callouts for satellites"
type: story
status: accepted
priority: high
epic: 3
epic_file: ../../epic.3.runbook-tutorial-wrappers.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 81
github_url: https://github.com/Gamaroff/agent-skills/issues/81
created: 2026-05-11
updated: 2026-05-13
completed_date: 2026-05-13
---

# Story 3.2: "Is this the right runbook?" callouts for satellites

**Status**: Accepted
**Review**: ✅ All review recommendations from `story.3.2.review.1.satellite-runbook-callouts.md` implemented 2026-05-13
**Tracker**: [#81](https://github.com/Gamaroff/agent-skills/issues/81)

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
- Story 1.3 (`docs/concepts/which-path.md`) has landed; cross-reference link resolves.

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

- [x] **Task 1**: Snapshot all 4 satellites for diff comparison (AC: 4)
- [x] **Task 2**: Draft 4 callouts (parameterised per runbook) ≤ 10 lines each (AC: 1, 2, 3)
- [x] **Task 3**: Insert into each file (AC: 1)
- [x] **Task 4**: Diff verification × 4 (AC: 4)
- [x] **Task 5**: Static validation + link check + status flip (AC: all)

## Testing

- Diff inspection (gating, ×4) + static validator + link check.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-13 | 1.1     | Review #1 passed (9/10) — status → ready-for-development | review-story  |
| 2026-05-13 | 1.2     | All 4 callouts implemented; status → ready-for-review | dev-agent     |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

### Implementation Summary

Four satellite runbooks (`hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, `change-management.md`) each received a top-of-file "Is this the right runbook?" callout block. Each callout is 8 lines, references `docs/concepts/which-path.md`, and is separated from the existing body by a `---` horizontal rule. All original body content is character-identical to pre-change.

### Start Date

2026-05-13

### Completion Date

2026-05-13

### Implementation Approach

Surgical insertions using Edit tool, one per file. Each edit anchored on `{title}\n\n{audience blockquote}` to ensure uniqueness. Callout content sourced from `story.3.2.plan.satellite-runbook-callouts.md` (pre-approved verbatim templates). Diff verification confirmed insertions-only via `diff new old` (all `<` lines, no `>` lines, no body changes). Line count verified at 8 per callout (≤10 AC3 ✅). `which-path.md` link verified in all 4 files (AC2 ✅).

### Testing Results

- Diff verification × 4: PASS (insertions only)
- Line count × 4: PASS (8 lines each, ≤10)
- Link check × 4: PASS (`which-path.md` present in all)
- No code/tests applicable (markdown-only changes)

### File List

**Modified:**
- `docs/runbooks/hotfix.md` — added callout block at top
- `docs/runbooks/bug-fix.md` — added callout block at top
- `docs/runbooks/create-parallel-stories.md` — added callout block at top
- `docs/runbooks/change-management.md` — added callout block at top
- `docs/prd/onboarding/epics/epic.3.runbook-tutorial-wrappers/stories/story.3.2.satellite-runbook-callouts/story.3.2.satellite-runbook-callouts.md` — status, tasks, this record

### Change Log (Dev Agent)

| Date | Description |
|---|---|
| 2026-05-13 | Implemented all 4 callout insertions; diff-verified; all ACs met |

### QA Prerequisites Checklist

- [x] All 4 satellite runbooks have callouts
- [x] Each callout ≤ 10 lines
- [x] Each callout references `which-path.md`
- [x] All 4 diffs show insertions only

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.3.2.qa.1.satellite-runbook-callouts.md](./story.3.2.qa.1.satellite-runbook-callouts.md)
- **Gate File**: [story.3.2.gate.1.satellite-runbook-callouts.yml](./story.3.2.gate.1.satellite-runbook-callouts.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: 4/4
- **Tests Executed**: 4 automated checks (grep, diff, line-count, link)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. All 4 acceptance criteria verified programmatically. Insertions-only confirmed; `which-path.md` link resolves.

## QA Completion Summary

**Final QA Status**: ✅ Passed
**QA Engineer**: QA Engineer
**Final Testing Date**: 2026-05-13

### Test Results Summary

- **All Acceptance Criteria Met**: Yes
- **Bug Reports Created**: 0
- **Bug Reports Closed**: 0
- **Regression Tests**: N/A (doc-only changes)
- **Performance**: N/A
- **Ready for Deployment**: Yes

## Definition of Done — PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `story.3.2.qa.1.satellite-runbook-callouts.md`
**Gate File**: `story.3.2.gate.1.satellite-runbook-callouts.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** All 4 criteria met (AC1–AC4 verified programmatically)
✅ **PR Review:** PR #108 open; documentation-only story (no code test suite required)
✅ **Documentation:** Story change log updated (3 versions); 4 runbooks modified with callout insertions
✅ **Security Review:** ✅ NOT_APPLICABLE — documentation change only, no security surface
✅ **Compliance:** ✅ NOT_APPLICABLE — internal developer documentation, no PII/GDPR/accessibility UI
✅ **Reliability:** ✅ PASS — all links resolve; `docs/concepts/which-path.md` exists

**Story marked as ACCEPTED on:** 2026-05-13

**Detailed Verification Log:** See `story.3.2.dod.1.satellite-runbook-callouts.md` for complete verification evidence.

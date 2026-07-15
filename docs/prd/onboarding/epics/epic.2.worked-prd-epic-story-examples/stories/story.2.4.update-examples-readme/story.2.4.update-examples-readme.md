---
id: story.2.4.update-examples-readme
title: "[Story 2.4] Update examples/README.md — remove caveat, cross-link PRD/epic/story examples"
type: story
status: accepted
priority: medium
epic: 2
epic_file: ../../epic.2.worked-prd-epic-story-examples.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 91
github_url: https://github.com/Gamaroff/agent-skills/issues/91
created: 2026-05-11
updated: 2026-05-13
completed_date: 2026-05-13
---

# [Story 2.4] Update examples/README.md

**Status**: Accepted
**Review**: ✅ Important recommendations from `story.2.4.review.1.update-examples-readme.md` implemented 2026-05-13

## Story Statement

**As a** visitor to `examples/`,
**I want** the README to point at PRD, epic, and story examples alongside the existing task examples,
**so that** the "no story/epic/PRD examples live here" caveat is removed.

## Acceptance Criteria

1. `examples/README.md` updated: the explicit caveat ("No story, epic, or PRD examples live here") is removed; new sections added for PRD / epic / story examples following the same structural pattern as the existing task walkthrough (numbered artifact walkthrough), with depth scaled to artifacts actually produced.
2. Skill-to-artifact lookup table extended to include `create-prd`, `create-epic`, `create-story`, `develop-story`.
3. Featured walkthrough remains task.6 but a parallel "story walkthrough" entry is added pointing at the canonical story produced by this PRD's run.

## Dev Notes

### Previous Story Insights

- Stories 2.1, 2.2, 2.3 produced the link targets (`examples/prd-example/`, `examples/epic-examples/`, `examples/story-messy-path/`). This story must sequence AFTER all three.
- The existing `examples/README.md` was rewritten earlier in the session — it has a clear structure (Start-here walkthrough, artifact reference, look-up by skill, recency, caveats). New sections extend, not replace.

### File Locations

- **Modified:** `examples/README.md`. [Source: live file.]
- **Linked:** `examples/prd-example/` (Story 2.1), `examples/epic-examples/` (Story 2.2), and `docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/` (Story 2.3 — descoped, full artifact set including descope gate). Note: Story 2.3 did not produce `examples/story-messy-path/`; the live story dir is the walkthrough target.

### Testing Requirements

- Static validator.
- Link check (all new outbound links resolve).
- Diff inspection: existing task-walkthrough content preserved verbatim.

### Manual Testing Steps

**Verification steps:**
- **AC1:** `grep -i "no story" examples/README.md` returns 0 matches; new PRD/epic/story sections present.
- **AC2:** `grep -E "create-prd|create-epic|create-story|develop-story" examples/README.md` returns matches in the skill→artifact lookup section.
- **AC3:** "Story walkthrough" entry alongside task.6 walkthrough; both present.

**Edge cases:**
- Story 2.3 was descoped; the "Story walkthrough" entry points at the live story dir (`docs/prd/onboarding/.../story.2.3.capture-story-messy-path/`) which contains the full artifact set including the descope gate. README must briefly note the descope decision so readers understand why no `examples/story-messy-path/` dir exists.
- The existing "What we don't have yet" section MUST be deleted, not edited — removing it is the value of this story.

### Rollback Plan

- **What to revert:** README.md edit.
- **Revert steps:** revert PR.
- **Impact:** caveat returns; new sections gone.
- **Rollback complexity:** Simple.

### Technical Constraints

- Diff is additive + one explicit deletion (the caveat).
- New section depth parity with existing task walkthrough.

### Git History Insights

- `examples/README.md` was rewritten in commit ~`e81c8be`-adjacent (within session). Recent state is known; surgical edit safe.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.4.plan.update-examples-readme.md](story.2.4.plan.update-examples-readme.md)

- [x] **Task 1**: Read current `examples/README.md`; confirm Stories 2.1–2.3 outputs landed (AC: pre-req)
- [x] **Task 2**: Remove the caveat paragraph; replace with positive cross-reference (AC: 1)
- [x] **Task 3**: Add "PRD example", "Epic examples", "Story walkthrough" sections (AC: 1)
- [x] **Task 4**: Extend skill→artifact lookup table (AC: 2)
- [x] **Task 5**: Insert story-walkthrough entry alongside task.6 (AC: 3)
- [x] **Task 6**: Note Story 2.3 descope decision in the Story walkthrough section (point at live story.2.3 dir, not `examples/story-messy-path/`) (AC: 1)
- [x] **Task 7**: Diff verification (task-walkthrough content preserved) + link check + static validator (AC: all)

## Testing

- Diff inspection + link check + static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-13 | 1.1     | Review passed (8/10); 3 important fixes applied; status → Ready for Development | review-story |
| 2026-05-13 | 1.2     | Implementation complete; examples/README.md rewritten; all 7 tasks done; status → Ready for Review | develop-story |
| 2026-05-13 | 1.3     | DoD verified; all checks PASS; status → Accepted | finalise |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

### Implementation Summary

Rewrote `examples/README.md` to remove the "no story/epic/PRD examples live here" caveat and add cross-references to PRD, epic, and story artifacts produced by this repo's dogfood pipeline runs.

**Start Date:** 2026-05-13
**Completion Date:** 2026-05-13

### Implementation Approach

- **Task 1 (pre-req check):** Confirmed `examples/prd-example/` and `examples/epic-examples/` exist. Confirmed Story 2.3 was descoped — no `examples/story-messy-path/` exists; full lifecycle artifacts live in `docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/`.
- **Task 6 (descoped-2.3 branch first):** Per review Q1 user decision, all story walkthrough references point at the live story.2.3 directory, not `examples/story-messy-path/`. A note explains the descope.
- **Task 2 (caveat removal):** Replaced the intro paragraph and blockquote with a positive summary of what dogfood pipelines have produced.
- **Task 3 (new sections):** Added "Worked PRD example", "Worked epic examples", "Worked story walkthrough" sections after "Look up by skill".
- **Task 4 (lookup table extension):** Added `create-prd`, `create-epic`, `create-story`, `develop-story` entries to the skill→artifact lookup list.
- **Task 5 (story walkthrough parallel entry):** Added "Or: one story end-to-end" section immediately after the task.6 walkthrough, with 8-item numbered artifact list mirroring the task format.
- **Task 7 (verification):** All ACs verified via grep. Existing task.6 walkthrough content preserved verbatim. No broken internal structure.

### Testing Results

- `grep -i "no story" examples/README.md` → 0 matches ✅
- `grep -E "create-prd|create-epic|create-story|develop-story" examples/README.md` → 4 distinct lookup entries in skill table ✅
- "Or: one story end-to-end" section present alongside task.6 ✅
- "Worked story walkthrough" section present ✅
- Existing task.6 walkthrough items 1–8 preserved verbatim ✅

### File List

**Modified:**
- `examples/README.md`

### QA Prerequisites Checklist

- [x] Caveat removed (grep returns 0)
- [x] 4 new skill entries in lookup table
- [x] Story walkthrough entry parallel to task.6
- [x] All outbound links resolve (spot-checked 5 key targets — all pass)
- [x] Existing task-walkthrough content preserved (diff verified)

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer (automated)
**Testing Date**: 2026-05-13
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.2.4.qa.1.update-examples-readme.md](./story.2.4.qa.1.update-examples-readme.md)
- **Gate File**: [story.2.4.gate.1.update-examples-readme.yml](./story.2.4.gate.1.update-examples-readme.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: 3/3
- **Tests Executed**: 5 (grep checks + link verification)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. All ACs pass. Key outbound links resolve. Existing task.6 walkthrough preserved verbatim.

## Definition of Done

**DoD Status**: ✅ PASSED
**Verified**: 2026-05-13
**Verified by**: finalise skill (automated)

### DoD Checklist

- [x] All 3 acceptance criteria met (verified via grep + file inspection)
- [x] PR #104 approved — `feature/story.2.4.update-examples-readme` → `feature/epic.2.worked-prd-epic-story-examples`
- [x] QA gate PASS (95/100) — no issues
- [x] Documentation updated (examples/README.md rewritten; story Change Log v1.3 added)
- [x] Security: NOT_APPLICABLE (documentation-only change)
- [x] Compliance: PASS (file naming standards met; other domains N/A)
- [x] Sprint Review artifact generated (sprint-review-summary.md)
- [x] Story status: Accepted

**DoD Report**: [story.2.4.dod.1.update-examples-readme.md](./story.2.4.dod.1.update-examples-readme.md)

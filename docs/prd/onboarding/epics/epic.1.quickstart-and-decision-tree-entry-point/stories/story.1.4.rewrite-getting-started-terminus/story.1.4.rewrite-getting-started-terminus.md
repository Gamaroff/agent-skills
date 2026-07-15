---
id: story.1.4.rewrite-getting-started-terminus
title: "[Story 1.4] Rewrite getting-started.md terminus to link to quickstarts"
type: story
status: accepted
priority: medium
epic: 1
epic_file: ../../epic.1.quickstart-and-decision-tree-entry-point.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 84
github_url: https://github.com/Gamaroff/agent-skills/issues/84
created: 2026-05-11
updated: 2026-05-12
completed_date: 2026-05-12
pr_number: 97
---

# [Story 1.4] Rewrite getting-started.md to terminate in quickstarts

**Status**: Accepted
**Review**: ✅ All review recommendations from `story.1.4.review.1.rewrite-getting-started-terminus.md` implemented 2026-05-12 (no critical/important issues; 2 optional notes deferred to implementation)

## Story Statement

**As a** new user reading `docs/concepts/getting-started.md`,
**I want** the doc to end with a concrete next-action ("now follow `quickstart-task.md`"),
**so that** I do not bounce off the open-ended "read the runbooks" terminus.

## Acceptance Criteria

1. `docs/concepts/getting-started.md` final section replaced with a "Next steps" block linking prominently to `quickstart-task.md`, `quickstart-story.md`, and `which-path.md`.
2. Diff is small — install checklist body preserved verbatim. Only the terminating section is rewritten.
3. Closing prose ≤ 20 lines. Cap covers the full replaced region — top-level "Next steps" block plus any "More depth" subsection demoted from the prior terminus.

## Dev Notes

### Previous Story Insights

- Stories 1.1, 1.2, 1.3 produce the link targets. This story sequences after them OR includes pending-link markers.
- All link targets live at `docs/concepts/quickstart-task.md`, `quickstart-story.md`, `which-path.md` — same directory as `getting-started.md`, so relative links are filename-only.

### Data Models / API / Components

N/A.

### File Locations

- **Modified:** `docs/concepts/getting-started.md` — only the terminating section. [Source: live file.]
- **Linked (siblings):** `quickstart-task.md`, `quickstart-story.md`, `which-path.md`.

### Testing Requirements

- Static: `documentation-standards-validator`.
- Diff inspection: confirm install checklist body unchanged (character-identical).
- Link check.

### Manual Testing Steps

**Prerequisites:** read `docs/concepts/getting-started.md` BEFORE edit; capture (a) its current install-checklist body for diff comparison AND (b) the current terminus block ("What's next" + "See also" lists) verbatim so the "More depth" demotion in Task 4 has an explicit source — nothing is dropped silently.

**Verification steps:**
- **AC1:** scan the new terminus for 3 prominent links (`quickstart-task.md`, `quickstart-story.md`, `which-path.md`).
- **AC2:** `git diff` shows ONLY the final section changed; install checklist body identical.
- **AC3:** count lines of the full replaced region (top-level "Next steps" + any "More depth" subsection); ≤ 20.

**Edge cases:**
- Existing terminus may already cross-link to runbooks — don't lose those links; demote them to a "More depth" subsection beneath the new "Next steps" block.
- If Stories 1.1–1.3 haven't landed yet, the links will 404. Acceptable IF the markdown link check workflow is configured to tolerate them, OR if this story is sequenced after 1.1–1.3. Recommend sequencing after 1.1 + 1.3 at minimum.

### Rollback Plan

- **What to revert:** changes to `docs/concepts/getting-started.md`.
- **Revert steps:** `git revert <pr-merge-commit>`.
- **Impact:** terminus reverts to status quo.
- **Rollback complexity:** Simple.

### Technical Constraints

- 20-line terminus cap (AC3).
- Install checklist preserved verbatim — diff inspection enforces.

### Git History Insights

- `getting-started.md` has not been heavily edited recently — low risk of merge conflicts.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.1.4.plan.rewrite-getting-started-terminus.md](story.1.4.plan.rewrite-getting-started-terminus.md)

- [x] **Task 1**: Read current `getting-started.md`; capture install-checklist body verbatim (AC: 2)
- [x] **Task 2**: Draft new "Next steps" block ≤ 20 lines, linking 3 targets (AC: 1, 3)
- [x] **Task 3**: Surgical replace — only the terminus, keep install checklist character-identical (AC: 2)
- [x] **Task 4**: Demote any existing runbook cross-links to "More depth" subsection (AC: 1)
- [x] **Task 5**: `git diff` review — install body unchanged (AC: 2)
- [x] **Task 6**: Static validation + link check + status flip (AC: 1, 3)

## Testing

- Diff inspection is the primary integration test.
- Static + link check supplement.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-12 | 1.1     | Review passed (9/10) — ready for development | review-story |
| 2026-05-12 | 1.2     | Applied 2 optional review notes (capture prior terminus; AC3 covers full replaced region) | review-story |

## Dev Agent Record

_(Populated by `/develop-story`.)_

## QA Handoff

**Completed**: _(Date)_ **Developer**: _(Name)_ **Branch**: _(branch)_ **PR**: _(link)_

### Summary / Testing Instructions / Areas Requiring Special Attention / Known Limitations

_(Developer fills in.)_

### QA Prerequisites Checklist

- [ ] All ACs implemented
- [ ] Install checklist body character-identical (verified by diff)
- [ ] Terminus ≤ 20 lines
- [ ] 3 outbound links resolve

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-12
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.1.4.qa.1.rewrite-getting-started-terminus.md](./story.1.4.qa.1.rewrite-getting-started-terminus.md)
- **Gate File**: [story.1.4.gate.1.rewrite-getting-started-terminus.yml](./story.1.4.gate.1.rewrite-getting-started-terminus.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: 3/3
- **Tests Executed**: 4 (diff inspection, link check, line count, security scan)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. All ACs met: terminus replaced (11 lines ≤ 20 cap), 3 quickstart links verified, install checklist preserved verbatim.

## QA Completion Summary

**Final QA Status**: ✅ Passed
**QA Engineer**: QA Engineer
**Final Testing Date**: 2026-05-12

### Test Results Summary

- **All Acceptance Criteria Met**: Yes
- **Bug Reports Created**: 0
- **Bug Reports Closed**: 0
- **Regression Tests**: N/A (documentation only)
- **Performance**: N/A
- **Ready for Deployment**: Yes

### Final Notes

Clean PASS on first review. Proceed to `/finalise`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `story.1.4.qa.1.rewrite-getting-started-terminus.md`
**Gate File**: `story.1.4.gate.1.rewrite-getting-started-terminus.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria verified:

✅ **Acceptance Criteria:** All 3 criteria met (terminus replaced 11 lines, 3 links, install checklist verbatim)
✅ **PR:** #97 open — `feature/story.1.4.rewrite-getting-started-terminus`
✅ **Documentation:** Change log (3 entries), QA report, gate file, implementation report, DoD log all present
✅ **Security Review:** ✅ PASS — no secrets, internal links only, pure markdown
✅ **Compliance:** ✅ PASS — doc standards compliant, heading hierarchy valid, links resolve
✅ **Performance:** N/A — static documentation
✅ **Reliability:** ✅ PASS — all 5 linked targets verified on disk

**Story marked as ACCEPTED on:** 2026-05-12

**Detailed Verification Log:** See `story.1.4.dod.1.rewrite-getting-started-terminus.md` for complete evidence and timestamps.

## Bug Reports

### Open Bugs / In QA Verification / Closed Bugs

_None._

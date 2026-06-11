---
id: story.2.2.capture-epics-as-worked-examples
title: "[Story 2.2] Capture all 4 epic docs as worked examples"
type: story
status: accepted
completed_date: 2026-05-12
pr_number: 102
priority: high
epic: 2
epic_file: ../../epic.2.worked-prd-epic-story-examples.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 92
github_url: https://github.com/Gamaroff/agent-skills/issues/92
created: 2026-05-11
updated: 2026-05-11
---

# [Story 2.2] Capture all 4 epic docs as worked examples

**Status**: Accepted
**Review**: ✅ Critical/Important recommendations implemented 2026-05-12 — see [`story.2.2.review.1.capture-epics-as-worked-examples.md`](story.2.2.review.1.capture-epics-as-worked-examples.md)

## Story Statement

**As a** future user authoring their first epic,
**I want** to see four real epic docs side-by-side,
**so that** I can pattern-match across them.

## Acceptance Criteria

1. `examples/epic-examples/` contains copies of all 4 epic docs from `docs/prd/onboarding/epics/epic.{1-4}.*/epic.{1-4}.*.md`.
2. A short index `examples/epic-examples/README.md` explains the relationship to the parent PRD, links to each captured epic, and links to each epic's story list (per Epic 2.AC2).
3. Frontmatter on each captured epic records `captured_skill_version`, `captured_date`, `source_sha`, `source_path` (mirror Story 2.1 schema).

## Dev Notes

### Previous Story Insights

- Story 2.1 established the provenance frontmatter pattern (`captured_skill_version`, `captured_date`, `source_sha`, `source_path`). Reuse verbatim.
- Story 2.1 chose copy-not-symlink. Use the same decision unless Story 2.1 implementation report says otherwise.
- **Schema scope note**: AC3 extends Epic 2.AC3 (which specifies only "skill version + date") with `source_sha` + `source_path` per the Story 2.1 precedent — keeps the four-field provenance schema consistent across all worked examples.

### File Locations

- **New dir:** `examples/epic-examples/`
  - `examples/epic-examples/epic.1.quickstart-and-decision-tree-entry-point.md` (copy)
  - `examples/epic-examples/epic.2.worked-prd-epic-story-examples.md`
  - `examples/epic-examples/epic.3.runbook-tutorial-wrappers.md`
  - `examples/epic-examples/epic.4.first-week-guided-learning-path.md`
  - `examples/epic-examples/README.md` (index)
- **Sources:** `docs/prd/onboarding/epics/epic.{1-4}.*/epic.{1-4}.*.md`.

### Testing Requirements

- Static validator on all 5 new files.
- File-equivalence diff per captured epic (only frontmatter delta).

### Manual Testing Steps

**Verification steps:**
- **AC1:** `ls examples/epic-examples/epic.*.md` returns 4 files; content matches sources modulo frontmatter.
- **AC2:** `README.md` lists all 4 epics with one-line description + link to captured copy.
- **AC3:** each captured file has the 4 provenance fields.

**Edge cases:**
- If any epic doc evolves between Epic 1–4 development and this story, the captured snapshot must record the source SHA at capture time. Stale captures become a follow-up validation problem (out of scope for this story).

### Rollback Plan

- **What to revert:** `examples/epic-examples/`.
- **Revert steps:** revert PR.
- **Impact:** parent epics remain canonical; no worked examples.
- **Rollback complexity:** Simple.

### Technical Constraints

- Same as Story 2.1: copy-not-symlink, provenance fields, README ≤ 200 lines.

### Git History Insights

- Per Story 2.1 implementation, decide if a small bash script in `scripts/` would automate this capture pattern for future PRDs. If yes, add as follow-up task (not in this story).

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.2.plan.capture-epics-as-worked-examples.md](story.2.2.plan.capture-epics-as-worked-examples.md)

- [x] **Task 1**: Create `examples/epic-examples/` (AC: 1)
- [x] **Task 2**: Copy 4 epic docs (AC: 1)
- [x] **Task 3**: Add provenance frontmatter to each copy (AC: 3)
- [x] **Task 4**: Draft `README.md` index (AC: 2)
- [x] **Task 5**: Equivalence verify per captured file (AC: 1)
- [x] **Task 6**: Static validation + status flip (AC: all)

## Testing

- Equivalence diffs (gating) + static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-12 | 1.1     | Review passed (8/10); AC2 + Dev Notes updated; status → Ready for Development | review-story  |
| 2026-05-12 | 1.2     | Implementation complete; 5 files created; status → Ready for Review | develop-story |
| 2026-05-12 | 1.3     | QA PASS (100/100); DoD verified; status → Accepted; PR #102 | finalise |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

### Implementation Summary

Copied all 4 onboarding epic docs into `examples/epic-examples/`, added provenance frontmatter to each, and created a README index linking each epic to its source and story list.

### Start Date

2026-05-12

### Completion Date

2026-05-12

### Implementation Approach

- **Task 1–2**: Created `examples/epic-examples/` and bulk-copied 4 epics using a bash loop with `git rev-parse HEAD` for source SHA.
- **Task 3**: Added 4 provenance fields (`captured_skill_version`, `captured_date`, `source_sha`, `source_path`) into each captured epic's YAML frontmatter using a Python snippet that splits on `---` delimiters.
- **Task 4**: Drafted `README.md` index (< 200 lines) with a table linking each epic to its captured copy and its story list directory.
- **Task 5**: Equivalence diffs confirmed all 4 copies match sources modulo provenance fields (grep-filtered before diff).
- **Task 6**: Static validator confirmed all 5 files present, all 4 epics have 4/4 provenance fields present.
- Copy-not-symlink decision reused from Story 2.1 (confirmed via `examples/prd-example/prd.onboarding.md` being a regular file).

### Testing Results

- 4/4 equivalence diffs: PASS
- 5/5 files static validation: PASS
- No unit tests required (docs-only story)

### File List

**Created:**
- `examples/epic-examples/epic.1.quickstart-and-decision-tree-entry-point.md`
- `examples/epic-examples/epic.2.worked-prd-epic-story-examples.md`
- `examples/epic-examples/epic.3.runbook-tutorial-wrappers.md`
- `examples/epic-examples/epic.4.first-week-guided-learning-path.md`
- `examples/epic-examples/README.md`

**Modified:**
- `docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.2.capture-epics-as-worked-examples/story.2.2.capture-epics-as-worked-examples.md` (status, tasks, this record)

### Deferred Work

Per Dev Notes: a helper script to automate capture for future PRDs is identified as a follow-up task (out of scope for this story).

### QA Prerequisites Checklist

- [x] All 4 epics captured
- [x] All 4 provenance frontmatters present
- [x] All 4 equivalence diffs pass
- [x] README index lists all 4

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-12
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.2.2.qa.1.capture-epics-as-worked-examples.md](story.2.2.qa.1.capture-epics-as-worked-examples.md)
- **Gate File**: [story.2.2.gate.1.capture-epics-as-worked-examples.yml](story.2.2.gate.1.capture-epics-as-worked-examples.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: 3/3
- **Tests Executed**: 4 equivalence diffs + 5 static-validation checks
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. All 3 ACs verified via direct file inspection; all 4 captured epics match source content modulo provenance fields.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

- **QA Report**: [`story.2.2.qa.1.capture-epics-as-worked-examples.md`](story.2.2.qa.1.capture-epics-as-worked-examples.md)
- **Gate File**: [`story.2.2.gate.1.capture-epics-as-worked-examples.yml`](story.2.2.gate.1.capture-epics-as-worked-examples.yml)
- **Gate Status**: ✅ PASS
- **Quality Score**: 100/100

All applicable Definition of Done criteria verified:

- ✅ **Acceptance Criteria:** 3/3 met (AC1: 4 epics copied; AC2: README index complete; AC3: provenance schema on all 4)
- ✅ **Tests:** 4/4 equivalence diffs PASS + 5/5 static validation checks PASS
- ✅ **PR Review:** PR #102 OPEN, targeting epic branch
- ✅ **Documentation:** Dev Agent Record complete; README.md index drafted
- ⚠️ **Security Review:** N/A — docs-only story
- ⚠️ **Compliance Review:** N/A — docs-only worked examples

**Detailed Verification Log:** See [`story.2.2.dod.1.capture-epics-as-worked-examples.md`](story.2.2.dod.1.capture-epics-as-worked-examples.md) for complete verification evidence.

**Story marked as ACCEPTED on:** 2026-05-12

---
id: story.2.1.capture-prd-as-worked-example
title: "[Story 2.1] Capture this PRD as the worked PRD example"
type: story
status: accepted
priority: high
epic: 2
epic_file: ../../epic.2.worked-prd-epic-story-examples.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 93
github_url: https://github.com/Gamaroff/agent-skills/issues/93
created: 2026-05-11
updated: 2026-05-12
completed_date: 2026-05-12
pr_number: 101
---

# [Story 2.1] Capture this PRD as the worked PRD example

**Status**: Accepted
**Review**: ✅ Important recommendations from `story.2.1.review.1.capture-prd-as-worked-example.md` implemented 2026-05-12

## Story Statement

**As a** future user authoring their first PRD,
**I want** to see a real PRD that went through the full pipeline,
**so that** I have a concrete reference for tone, depth, and section shape.

## Acceptance Criteria

1. `examples/prd-example/` directory exists and contains a faithful copy of `docs/prd/onboarding/prd.onboarding.md`. Decision between copy-vs-symlink documented in implementation report. Recommendation: **copy** for stability (symlinks break on Windows clones).
2. `examples/prd-example/README.md` narrates the PRD: what was easy, what required iteration, what `pm-checklist` flagged.
3. Frontmatter on the captured copy records provenance for staleness detection. Canonical field set: `captured_skill_version`, `captured_date`, `source_sha`, `created`. `captured_skill_version` is sourced from `skills/create-prd/package.json` `version` field.

## Dev Notes

### Previous Story Insights

- Epic 2 sequencing: runs LAST in the overall PRD execution. By the time this story develops, Stories 1.1–1.5, 3.1–3.3, and 4.1–4.5 have produced real artifacts to capture.
- The canonical PRD at `docs/prd/onboarding/prd.onboarding.md` already exists (created during the parent PRD's pre-flight). Story 2.1 copies it.

### File Locations

- **New dir:** `examples/prd-example/`
  - `examples/prd-example/prd.onboarding.md` (copy)
  - `examples/prd-example/README.md` (narrative)
- **Source:** `docs/prd/onboarding/prd.onboarding.md`.

### Testing Requirements

- Static: `documentation-standards-validator` on both new files.
- File-equivalence: `diff docs/prd/onboarding/prd.onboarding.md examples/prd-example/prd.onboarding.md` should differ only in the added `captured_skill_version` frontmatter field.

### Manual Testing Steps

**Prerequisites:** parent PRD exists at `docs/prd/onboarding/prd.onboarding.md`.

**Verification steps:**
- **AC1:** `ls examples/prd-example/prd.onboarding.md` exists; content matches source modulo frontmatter version field.
- **AC2:** README narrates 3+ specific moments: an "easy" choice, an "iterated" decision, a `pm-checklist` finding.
- **AC3:** frontmatter has all four: `captured_skill_version`, `captured_date`, `source_sha`, `created`. `captured_skill_version` matches `skills/create-prd/package.json` `version`.

**Edge cases:**
- Source PRD may have evolved between epic creation and this story's development. Document the source-PRD git SHA in the captured file's frontmatter for traceability.
- The narrative README is the *value* of this story — a copy without narration is just a duplicate. The README must add insight, not summarize.

### Rollback Plan

- **What to revert:** `examples/prd-example/` directory.
- **Revert steps:** revert PR.
- **Impact:** parent PRD remains the only PRD copy in repo; no worked example.
- **Rollback complexity:** Simple.

### Technical Constraints

- Copy-vs-symlink: recommend copy (Windows-safe). Note in implementation report.
- Narrative README ≤ 200 lines.
- **`captured_skill_version` source**: read `version` from `skills/create-prd/package.json`. If `package.json` does not yet exist on the skill, Task 0 creates it with `version: 0.1.0`. This establishes the per-skill versioning pattern used for staleness detection across future captures (Stories 2.2, 2.3).
- **`source_sha`**: `git log -1 --format=%H -- docs/prd/onboarding/prd.onboarding.md` at capture time.

### Git History Insights

- This story creates content under `examples/`, which has been previously touched in PR adding `examples/README.md`. Pattern: each subdir has its own `README.md`.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.1.plan.capture-prd-as-worked-example.md](story.2.1.plan.capture-prd-as-worked-example.md)

- [x] **Task 0** (prereq): Create `skills/create-prd/package.json` with `{ "name": "create-prd", "version": "0.1.0" }` to anchor `captured_skill_version`. (AC: 3)
- [x] **Task 1**: Create `examples/prd-example/` directory (AC: 1)
- [x] **Task 2**: Copy `docs/prd/onboarding/prd.onboarding.md` → `examples/prd-example/prd.onboarding.md` (AC: 1)
- [x] **Task 3**: Add provenance frontmatter — all four fields: `captured_skill_version` (from `skills/create-prd/package.json`), `captured_date`, `source_sha` (git SHA of source PRD), and preserve `created` (AC: 3)
- [x] **Task 4**: Draft narrative `README.md` (AC: 2)
- [x] **Task 5**: Verify file equivalence modulo frontmatter (AC: 1)
- [x] **Task 6**: Static validation + status flip (AC: all)

## Testing

- File-equivalence diff (gating).
- Static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-12 | 1.1     | Review-1 fixes: normalize 4-field frontmatter; add Task 0 (per-skill package.json); document `captured_skill_version` source | review-story |
| 2026-05-12 | 1.2     | Status: Draft → Ready for Development (review passed post-fix) | review-story |
| 2026-05-12 | 1.3     | Implementation complete — all tasks done, status → Ready for Review | develop-story |

## Dev Agent Record

**Implemented**: 2026-05-12 **Branch**: `feature/story.2.1.capture-prd-as-worked-example`

- Task 0: Created `skills/create-prd/package.json` `{"name":"create-prd","version":"0.1.0"}`
- Task 1–3: Created `examples/prd-example/prd.onboarding.md` — copy of source PRD with 3 provenance fields added to frontmatter
- Task 4: Created `examples/prd-example/README.md` — 60-line narrative covering what was easy, what iterated, pm-checklist findings
- Task 5: `diff` confirms only 3-line provenance frontmatter addition
- Copy chosen over symlink (Windows-safe; documented in implementation report)

## QA Handoff

**Completed**: 2026-05-12 **Developer**: develop-story pipeline **Branch**: `feature/story.2.1.capture-prd-as-worked-example` **PR**: _(pending)_

### QA Prerequisites Checklist

- [x] All ACs implemented
- [x] Captured file diffs only in frontmatter (verified by `diff`)
- [x] Narrative README adds insight beyond summary
- [x] `source_sha` field present and resolves on GitHub

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer (develop-story pipeline)
**Testing Date**: 2026-05-12
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.2.1.qa.1.capture-prd-as-worked-example.md](./story.2.1.qa.1.capture-prd-as-worked-example.md)
- **Gate File**: [story.2.1.gate.1.capture-prd-as-worked-example.yml](./story.2.1.gate.1.capture-prd-as-worked-example.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: 3/3
- **Tests Executed**: Direct static inspection (no executable tests — doc-only story)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues. One LOW observation (examples/README.md caveat now inconsistent) intentionally deferred to Story 2.4 per IV2.

## QA Completion Summary

**Final QA Status**: ✅ Passed
**QA Engineer**: QA Engineer (develop-story pipeline)
**Final Testing Date**: 2026-05-12

### Test Results Summary

- **All Acceptance Criteria Met**: Yes
- **Bug Reports Created**: 0
- **Bug Reports Closed**: 0
- **Regression Tests**: N/A (doc-only)
- **Performance**: N/A (static files)
- **Ready for Deployment**: Yes

## Bug Reports

### Open / In QA / Closed

_None._

## Definition of Done — PASSED ✅

**Accepted:** 2026-05-12
**DoD Report:** [story.2.1.dod.1.capture-prd-as-worked-example.md](./story.2.1.dod.1.capture-prd-as-worked-example.md)
**PR:** https://github.com/Gamaroff/agent-skills/pull/101

| Check | Status |
|-------|--------|
| All Acceptance Criteria Met | ✅ PASS |
| PR Open | ✅ PASS (#101) |
| Security Review | ✅ PASS (doc-only — no surface) |
| Compliance Review | ⚠️ NOT_APPLICABLE (doc-only) |
| Docs & Changelog | ✅ PASS |
| QA Gate | ✅ PASS (100/100) |

**Story accepted and ready for Sprint Review.**

---
id: story.2.1.capture-prd-as-worked-example
title: "Story 2.1: Capture this PRD as the worked PRD example"
type: story
status: draft
priority: high
epic: 2
epic_file: ../../epic.2.worked-prd-epic-story-examples.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: null
github_url: null
created: 2026-05-11
updated: 2026-05-11
---

# Story 2.1: Capture this PRD as the worked PRD example

**Status**: Draft

## Story Statement

**As a** future user authoring their first PRD,
**I want** to see a real PRD that went through the full pipeline,
**so that** I have a concrete reference for tone, depth, and section shape.

## Acceptance Criteria

1. `examples/prd-example/` directory exists and contains a faithful copy of `docs/prd/onboarding/prd.onboarding.md`. Decision between copy-vs-symlink documented in implementation report. Recommendation: **copy** for stability (symlinks break on Windows clones).
2. `examples/prd-example/README.md` narrates the PRD: what was easy, what required iteration, what `pm-checklist` flagged.
3. Frontmatter on the captured copy records the skill version that produced the PRD (so staleness is detectable). New field: `captured_skill_version` plus existing `created`.

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
- **AC3:** frontmatter has `captured_skill_version` + `captured_date`.

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

### Git History Insights

- This story creates content under `examples/`, which has been previously touched in PR adding `examples/README.md`. Pattern: each subdir has its own `README.md`.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.1.plan.capture-prd-as-worked-example.md](story.2.1.plan.capture-prd-as-worked-example.md)

- [ ] **Task 1**: Create `examples/prd-example/` directory (AC: 1)
- [ ] **Task 2**: Copy `docs/prd/onboarding/prd.onboarding.md` → `examples/prd-example/prd.onboarding.md` (AC: 1)
- [ ] **Task 3**: Add provenance frontmatter (`captured_skill_version`, `captured_date`, `source_sha`) (AC: 3)
- [ ] **Task 4**: Draft narrative `README.md` (AC: 2)
- [ ] **Task 5**: Verify file equivalence modulo frontmatter (AC: 1)
- [ ] **Task 6**: Static validation + status flip (AC: all)

## Testing

- File-equivalence diff (gating).
- Static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record

_(Populated by `/develop-story`.)_

## QA Handoff

**Completed**: _(Date)_ **Developer**: _(Name)_ **Branch**: _(branch)_ **PR**: _(link)_

### QA Prerequisites Checklist

- [ ] All ACs implemented
- [ ] Captured file diffs only in frontmatter
- [ ] Narrative README adds insight beyond summary
- [ ] `source_sha` field present and resolves on GitHub

## QA Report

_(Added on QA completion.)_

## Bug Reports

### Open / In QA / Closed

_None._

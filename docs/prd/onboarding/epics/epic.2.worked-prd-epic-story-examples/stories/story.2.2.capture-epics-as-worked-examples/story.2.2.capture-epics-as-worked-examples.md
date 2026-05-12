---
id: story.2.2.capture-epics-as-worked-examples
title: "Story 2.2: Capture all 4 epic docs as worked examples"
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

# Story 2.2: Capture all 4 epic docs as worked examples

**Status**: Draft

## Story Statement

**As a** future user authoring their first epic,
**I want** to see four real epic docs side-by-side,
**so that** I can pattern-match across them.

## Acceptance Criteria

1. `examples/epic-examples/` contains copies of all 4 epic docs from `docs/prd/onboarding/epics/epic.{1-4}.*/epic.{1-4}.*.md`.
2. A short index `examples/epic-examples/README.md` explains the relationship to the parent PRD and links to each captured epic.
3. Frontmatter on each captured epic records `captured_skill_version`, `captured_date`, `source_sha`, `source_path` (mirror Story 2.1 schema).

## Dev Notes

### Previous Story Insights

- Story 2.1 established the provenance frontmatter pattern (`captured_skill_version`, `captured_date`, `source_sha`, `source_path`). Reuse verbatim.
- Story 2.1 chose copy-not-symlink. Use the same decision unless Story 2.1 implementation report says otherwise.

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

- [ ] **Task 1**: Create `examples/epic-examples/` (AC: 1)
- [ ] **Task 2**: Copy 4 epic docs (AC: 1)
- [ ] **Task 3**: Add provenance frontmatter to each copy (AC: 3)
- [ ] **Task 4**: Draft `README.md` index (AC: 2)
- [ ] **Task 5**: Equivalence verify per captured file (AC: 1)
- [ ] **Task 6**: Static validation + status flip (AC: all)

## Testing

- Equivalence diffs (gating) + static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated by `/develop-story` and downstream skills.)_

### QA Prerequisites Checklist

- [ ] All 4 epics captured
- [ ] All 4 provenance frontmatters present
- [ ] All 4 equivalence diffs pass
- [ ] README index lists all 4

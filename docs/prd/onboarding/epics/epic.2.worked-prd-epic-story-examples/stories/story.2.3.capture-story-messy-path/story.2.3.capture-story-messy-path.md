---
id: story.2.3.capture-story-messy-path
title: "Story 2.3: Capture a story with the messy path (real QA-gate FAIL → PASS)"
type: story
status: draft
priority: high
epic: 2
epic_file: ../../epic.2.worked-prd-epic-story-examples.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 94
github_url: https://github.com/Gamaroff/agent-skills/issues/94
created: 2026-05-11
updated: 2026-05-11
---

# Story 2.3: Capture a story with the messy path

**Status**: Draft

## Story Statement

**As a** future user encountering their first QA-gate FAIL,
**I want** to see a real story that failed `qa-gate` and was revised,
**so that** the messy path is visible, not just the happy path.

## Acceptance Criteria

1. `examples/story-messy-path/` contains: the original story doc, the `qa-gate` FAIL artifact, the revision diff (or revised story doc), and the eventual `qa-gate` PASS artifact.
2. `examples/story-messy-path/README.md` narrates what triggered the FAIL and what the revision did.
3. The story used is one that **genuinely failed QA** during this PRD's pipeline run — do not manufacture a failure. Provenance fields (`source_story`, `source_sha`) trace back to the real story.

## Dev Notes

### Previous Story Insights

- Stories 2.1 + 2.2 establish provenance-frontmatter pattern + narrative-README pattern. Reuse.
- This story is **provenance-gated**: it cannot be developed until at least one story from Epic 1, 3, or 4 has gone through a real QA-gate FAIL → PASS cycle. If no FAIL occurs naturally by the time Epic 2 runs, this story stalls and is **descoped** rather than manufactured.

### File Locations

- **New dir:** `examples/story-messy-path/`
  - `story.<E>.<S>.<name>.md` (original)
  - `story.<E>.<S>.gate.{n-fail}.<name>.yml` (FAIL gate)
  - `story.<E>.<S>.gate.{n-pass}.<name>.yml` (PASS gate)
  - `story.<E>.<S>.revision.md` (revision narrative or diff)
  - `README.md` (narrative)
- **Sources:** wherever the genuinely-failed story lives under `docs/prd/onboarding/epics/epic.*/stories/`.

### Testing Requirements

- Static validator.
- Provenance verification: `source_story` field in each captured file resolves to a real path under `docs/prd/onboarding/`.

### Manual Testing Steps

**Verification steps:**
- **AC1:** dir contains 4+ files (original story, FAIL gate, PASS gate, revision artifact).
- **AC2:** README has 2 sections — "What triggered the FAIL" and "What the revision did" — each with concrete pointers to lines/files.
- **AC3:** `git log --follow` on the captured original story file shows a real QA-gate FAIL commit followed by a PASS commit. Provenance fields point at those commits.

**Edge cases:**
- If no genuine FAIL has occurred by Epic 2 development time, **descope** this story; mark status `cancelled` per `docs/standards/document-status-lifecycle.md`; document the descope decision in the story's Change Log. Do NOT manufacture a failure.
- Multiple FAILs may exist — pick the most pedagogically valuable (clearest cause, cleanest fix). Reasoning recorded in narrative README.

### Rollback Plan

- **What to revert:** `examples/story-messy-path/`.
- **Revert steps:** revert PR.
- **Impact:** users without messy-path example fall back to the happy-path story-walkthrough.
- **Rollback complexity:** Simple.

### Technical Constraints

- AC3 is the hard constraint — real provenance only.
- Captured gate YAMLs preserved verbatim including timestamps.

### Git History Insights

- Watch the PR runs of Epics 1, 3, 4 develop-story chains for actual QA-gate FAIL events. The `qa-fix` loop iterations in `develop-story` are the natural source.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.3.plan.capture-story-messy-path.md](story.2.3.plan.capture-story-messy-path.md)

- [ ] **Task 1**: Survey accepted stories from Epics 1, 3, 4 for QA-gate FAIL artifacts; pick the strongest pedagogical case (AC: 3)
- [ ] **Task 2**: If no genuine FAIL exists → descope this story; mark `cancelled`; record decision in Change Log; STOP.
- [ ] **Task 3**: Create `examples/story-messy-path/` and copy original story + FAIL gate + PASS gate + revision artifact (AC: 1, 3)
- [ ] **Task 4**: Add provenance frontmatter to captured copies (AC: 3)
- [ ] **Task 5**: Draft narrative `README.md` (AC: 2)
- [ ] **Task 6**: Static validation + provenance verification + status flip (AC: all)

## Testing

- Provenance check via `git log --follow` (gating).
- Static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated by `/develop-story` and downstream.)_

### QA Prerequisites Checklist

- [ ] FAIL provenance verified via git history
- [ ] All 4 captured files present (or story descoped with rationale)
- [ ] README narrative names specific cause + fix
- [ ] Provenance frontmatters complete

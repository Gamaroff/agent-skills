---
id: story.1.3.decision-tree-which-path
title: "Story 1.3: Decision tree — which path?"
type: story
status: ready-for-review
priority: high
epic: 1
epic_file: ../../epic.1.quickstart-and-decision-tree-entry-point.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 85
github_url: https://github.com/Gamaroff/agent-skills/issues/85
created: 2026-05-11
updated: 2026-05-12
---

# Story 1.3: Decision tree — which path?

**Status**: Ready for Review
**Review**: ✅ Optional recommendations implemented 2026-05-12 — see `story.1.3.review.1.decision-tree-which-path.md`

## Story Statement

**As a** new user uncertain whether to use task, story, hotfix, or parallel paths,
**I want** a single page with a decision tree mapping intent to skill,
**so that** I land in the right runbook without trial-and-error.

## Acceptance Criteria

1. New file `docs/concepts/which-path.md` exists with valid frontmatter and lifecycle compliance.
2. Decision tree covers four leaves: task (`/create-task`), story (`/create-story`), hotfix (`/hotfix`), parallel work (`/parallel-stories`).
3. Each leaf links to the matching runbook AND the matching quickstart (where one exists — task quickstart from Story 1.1, story quickstart from Story 1.2).
4. Format: Mermaid `flowchart` + prose fallback (for accessibility — screen readers + non-Mermaid markdown renderers).
5. Doc body ≤ 250 lines.

## Dev Notes

### Previous Story Insights

Stories 1.1 and 1.2 establish the `docs/concepts/quickstart-*.md` pattern. This story links into them at the leaves. If 1.1/1.2 not yet merged when 1.3 lands, links go in as relative paths — they'll resolve when those stories land. Markdown link check workflow tolerates this if files exist at the expected paths.

### Data Models / API / Components

N/A.

### File Locations

- **New doc:** `docs/concepts/which-path.md`. [Source: live tree.]
- **Linked runbooks** (verify all 4 exist):
  - `docs/runbooks/task-development.md`
  - `docs/runbooks/story-development.md`
  - `docs/runbooks/hotfix.md`
  - `docs/runbooks/parallel-stories.md`

### Testing Requirements

- Static: `documentation-standards-validator`.
- Mermaid pre-flight: run `mermaid-architect` skill for syntax validation before relying on GitHub preview.
- Mermaid rendering: visually verify on GitHub preview before merging (Mermaid blocks render server-side on github.com).
- Link check: all 4 runbooks + 2 quickstarts must resolve.
- Branch coverage: verify each decision-tree branch terminates at exactly one leaf (no orphan questions, no dead ends).

### Manual Testing Steps

**Prerequisites:** none beyond a markdown viewer with Mermaid support.

**Verification steps:**
- **AC1:** file exists; frontmatter valid; `documentation-standards-validator` PASS.
- **AC2:** scan for 4 leaf nodes naming `/create-task`, `/create-story`, `/hotfix`, `/parallel-stories`.
- **AC3:** each leaf has 1–2 outbound links; all resolve (link check).
- **AC4:** Mermaid block renders on GitHub preview; prose fallback section present.
- **AC5:** `wc -l ≤ 250`.

**Edge cases:**
- Mermaid syntax errors silently fall back to code block on GitHub — visual verification needed.
- Decision-tree branches must be exhaustive AND mutually exclusive — a user with an ambiguous intent should land in `/create-story` (the most expressive path) as the default leaf.

### Rollback Plan

- **What to revert:** `docs/concepts/which-path.md`.
- **Revert steps:** revert PR.
- **Impact:** users without the decision tree fall back to skimming `docs/reference/invocation.md` or `docs/runbooks/README.md`.
- **Rollback complexity:** Simple.

### Technical Constraints

- 250-line cap (AC5) — keeps tree scannable.
- Mermaid is the only required rendering tech (already used elsewhere per repo conventions).
- No JS / no interactivity — static markdown only.

### Git History Insights

- Commit `a79d3ee` (docs: replace diagrams/ links with README refs; prune removed skill entries) — Mermaid lives inline in `.md`, no separate `diagrams/` dir. Confirms inline-Mermaid pattern.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.1.3.plan.decision-tree-which-path.md](story.1.3.plan.decision-tree-which-path.md)

- [x] **Task 1**: File skeleton + frontmatter (AC: 1)
- [x] **Task 2**: Draft decision questions hierarchy (intent → context → leaf) (AC: 2)
- [x] **Task 3**: Author Mermaid `flowchart` (AC: 2, 4)
- [x] **Task 4**: Author prose fallback that mirrors the flowchart's branching (AC: 4)
- [x] **Task 5**: Wire leaf links to runbooks + quickstarts (AC: 3)
- [ ] **Task 6**: Visual verify Mermaid render on GitHub preview (AC: 4)
- [x] **Task 7**: Static validation, line-count check, status flip (AC: 1, 5)

## Testing

- Static + link check + visual Mermaid render verification.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-12 | 1.1     | Review #1 passed (9/10) — optional fixes applied, status → Ready for Development | review-story |

## Dev Agent Record

- **Branch**: `feature/story.1.3.decision-tree-which-path`
- **Implemented**: 2026-05-12 by `develop-story` pipeline
- **Key decisions**: Implemented directly (pure doc story, no code changes); Mermaid `flowchart TD` pattern from siblings; 78 lines (well under 250 cap)
- **Files created**: `docs/concepts/which-path.md`
- **Files modified**: `docs/concepts/README.md` (added entry)

## QA Handoff

**Completed**: 2026-05-12 **Developer**: develop-story pipeline **Branch**: `feature/story.1.3.decision-tree-which-path` **PR**: _(see Step 4)_

### Summary / Testing Instructions / Areas Requiring Special Attention / Known Limitations

Created `docs/concepts/which-path.md` — Mermaid `flowchart TD` + prose fallback routing users to `/create-task`, `/create-story`, `/hotfix`, or `/parallel-stories` via 3 questions.

**Testing instructions:**
1. Open the file on GitHub after PR is raised — confirm Mermaid renders (not a code block)
2. Verify 4 leaf nodes name the correct skills
3. Click all 6 outbound links — 4 runbooks + 2 quickstarts — confirm they resolve
4. Run `wc -l docs/concepts/which-path.md` — should be ≤ 250

**Special attention:** Task 6 (visual Mermaid verify) requires GitHub preview — must be done after PR is raised.

### QA Prerequisites Checklist

- [ ] All ACs implemented
- [ ] Mermaid renders correctly on GitHub
- [ ] All 6 outbound links resolve
- [ ] Doc ≤ 250 lines
- [ ] Validator PASS

## QA Report

_(Added on QA completion.)_

## Bug Reports

### Open Bugs / In QA Verification / Closed Bugs

_None._

---
id: story.1.5.readme-start-here-callout
title: "Story 1.5: README Start-here callout"
type: story
status: draft
priority: medium
epic: 1
epic_file: ../../epic.1.quickstart-and-decision-tree-entry-point.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: null
github_url: null
created: 2026-05-11
updated: 2026-05-11
---

# Story 1.5: README "Start here" callout

**Status**: Draft

## Story Statement

**As a** visitor on the repo homepage,
**I want** a "Start here" callout near the top of `README.md`,
**so that** I do not have to scan the full README to find an entry point.

## Acceptance Criteria

1. `README.md` gains a visually prominent "Start here" block within the first viewport (above the skill catalog list), linking to `docs/concepts/which-path.md`.
2. Existing README content not reorganized — block is inserted, not replacing structure.
3. Block ≤ 10 lines.

## Dev Notes

### Previous Story Insights

- Story 1.3 produces `which-path.md` — the link target. Sequence 1.5 after 1.3.
- All prior 1.x stories established the "additive, not restructure" pattern. Same discipline here.
- Linux walkthrough verification deferred from Stories 1.1 + 1.2 to THIS story per parent NFR3 — closing story of Epic 1 takes responsibility.

### Data Models / API / Components

N/A.

### File Locations

- **Modified:** `README.md` (repo root). [Source: live file.]
- **Linked:** `docs/concepts/which-path.md` (Story 1.3 output).

### Testing Requirements

- Static: `documentation-standards-validator` (README has frontmatter? — verify; if not, skip frontmatter checks).
- Visual: GitHub web render — callout visible in first viewport.
- Linux walkthrough verification of Story 1.1 + 1.2 quickstarts (deferred per NFR3).

### Manual Testing Steps

**Prerequisites:** GitHub web view of the PR; Linux environment for the deferred walkthrough verification.

**Verification steps:**
- **AC1:** open README on GitHub web; callout visible without scrolling on a 1080p viewport (~30 lines of README visible above the fold).
- **AC2:** `git diff README.md` shows only an insertion — no structural moves.
- **AC3:** callout block ≤ 10 lines.
- **Linux NFR3 verification:** clone repo on a Linux box; walk `quickstart-task.md` and `quickstart-story.md` to completion; record elapsed times.

**Edge cases:**
- `npm run generate-catalog` regenerates portions of README. The callout must live in a manually-edited region. Verify the generator does not stomp the callout — run the generator and confirm the callout survives.
- README has badges + install instructions in the first viewport already; callout must coexist without pushing those below the fold.

### Rollback Plan

- **What to revert:** README.md edit.
- **Revert steps:** `git revert <pr-merge-commit>`.
- **Impact:** users without callout fall back to scanning README.
- **Rollback complexity:** Simple.

### Technical Constraints

- 10-line block cap (AC3).
- Must survive `npm run generate-catalog` re-runs.
- First-viewport visibility — depends on README structure; verify via GitHub web preview.

### Git History Insights

- Commit `a79d3ee` (docs: replace diagrams/ links with README refs; prune removed skill entries) — README is actively edited and references to it must stay consistent.
- No recent restructure of README's top portion — safe to insert above the skill catalog.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.1.5.plan.readme-start-here-callout.md](story.1.5.plan.readme-start-here-callout.md)

- [ ] **Task 1**: Read current README; identify the line where the callout should land (after badges, before catalog) (AC: 1, 2)
- [ ] **Task 2**: Draft callout block ≤ 10 lines (AC: 3)
- [ ] **Task 3**: Insert via Edit tool with precise `old_string` (AC: 1, 2)
- [ ] **Task 4**: Run `npm run generate-catalog`; confirm callout survives (AC: 2)
- [ ] **Task 5**: GitHub web preview — confirm first-viewport visibility (AC: 1)
- [ ] **Task 6**: Linux walkthrough verification of Stories 1.1 + 1.2 (parent NFR3)
- [ ] **Task 7**: Static validation + status flip (AC: all)

## Testing

- Diff inspection.
- GitHub web preview render check.
- Catalog-generator survival check.
- Linux walkthrough is parent-NFR3 verification, scoped here as closing-story responsibility.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record

_(Populated by `/develop-story`.)_

## QA Handoff

**Completed**: _(Date)_ **Developer**: _(Name)_ **Branch**: _(branch)_ **PR**: _(link)_

### Summary / Testing Instructions / Areas Requiring Special Attention / Known Limitations

_(Developer fills in.)_

### QA Prerequisites Checklist

- [ ] All ACs implemented
- [ ] README diff is insertion-only
- [ ] Callout ≤ 10 lines
- [ ] Callout survives `npm run generate-catalog`
- [ ] First-viewport visibility verified on GitHub web
- [ ] Linux walkthroughs of 1.1 + 1.2 recorded in implementation report

## QA Report

_(Added on QA completion.)_

## Bug Reports

### Open Bugs / In QA Verification / Closed Bugs

_None._

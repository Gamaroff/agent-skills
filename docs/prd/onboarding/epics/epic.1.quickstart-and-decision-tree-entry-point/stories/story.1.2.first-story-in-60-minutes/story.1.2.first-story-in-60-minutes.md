---
id: story.1.2.first-story-in-60-minutes
title: "Story 1.2: First story in 60 minutes — quickstart"
type: story
status: draft
priority: high
epic: 1
epic_file: ../../epic.1.quickstart-and-decision-tree-entry-point.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 78
github_url: https://github.com/Gamaroff/agent-skills/issues/78
created: 2026-05-11
updated: 2026-05-11
---

# Story 1.2: First story in 60 minutes — quickstart

**Status**: Draft

## Story Statement

**As a** new user who has completed the task quickstart,
**I want** a similarly tight walkthrough that produces a story artifact set end-to-end,
**so that** I can see the full PRD → epic → story → develop-story chain working without committing to the 274-line `story-development.md` runbook.

## Acceptance Criteria

1. New file `docs/concepts/quickstart-story.md` exists with valid YAML frontmatter and lifecycle status compliance (mirror Story 1.1 requirements).
2. Walkthrough covers, in order: `/create-prd` (tiny example PRD) → `/create-epic` → `/create-story` → `/develop-story` → artifact review → cleanup.
3. Walking the doc verbatim on a clean clone produces all expected artifacts (PRD, epic, story, review, implementation report, PR, QA, gate, DoD, sprint review) in ≤ 60 min wall time.
4. Cross-links to `examples/` worked artifacts exist (pending until Epic 2 lands — links present, marked TBD if target absent).
5. Doc body ≤ 400 lines (parent NFR4).

## Dev Notes

### Previous Story Insights

- Story 1.1 established the quickstart-doc pattern: terse intro, section-per-pipeline-stage with time budget headings, dual-path cleanup, walkthrough-as-integration-test.
- Practice-target principle: pick a small, isolated example up-front and use it across the entire doc. For Story 1.2, recommend a one-story PRD ("add a footer link to a docs page") — small enough to fit the develop-story chain in budget.
- AskUserQuestion prompts at Phase 0 of `/develop-story` must be pre-warned (base branch, PR target, optional epic branch). Same pattern as Story 1.1 Task 4.

### Data Models / API / Components

N/A — pure documentation story.

### File Locations

- **New doc:** `docs/concepts/quickstart-story.md` — sibling to `quickstart-task.md` (Story 1.1).
  [Source: live tree under `docs/concepts/`.]
- **Reference anchor:** `docs/runbooks/story-development.md` (274 lines) — quickstart deliberately undercuts this; links out for depth.

### Testing Requirements

- **Static:** `documentation-standards-validator`.
- **Dynamic:** walkthrough on clean clone with stopwatch, macOS minimum (parent NFR3 — Linux walks deferred to Epic 1 closing story 1.5).

### Manual Testing Steps

**Prerequisites:** clean clone, Node ≥ 20, gh CLI authenticated (story PRs target GitHub), `project.yml` present.

**Navigation path:** doc-only. Walk top-to-bottom.

**Verification steps:**
- **AC1:** `ls docs/concepts/quickstart-story.md`; `head -15` shows valid frontmatter; `documentation-standards-validator` PASS.
- **AC2:** Section heads appear in stated order; each non-empty.
- **AC3:** Stopwatched walk produces all 10 artifact types under their canonical paths; elapsed ≤ 60 min.
- **AC4:** Examples cross-links present (markdown link check workflow passes; targets may be 404 if Epic 2 not landed — note as "pending Epic 2").
- **AC5:** `wc -l ≤ 400`.

**Edge cases:**
- `/develop-story` chain emits more AskUserQuestion prompts than `/develop-task` (Phase 0 base/PR-target/epic-branch). Doc must pre-warn ALL of them with recommended defaults — bare minimum: base=develop, PR target=epic branch, epic branch=Yes if creating fresh.
- Registry pollution risk doubles: both `docs/epic-registry.md` AND `docs/tasks/task-registry.md` (if a pipeline bug triggers a task lane) may get rows. Cleanup section must address both.
- 60-min budget is brittle. Recommend the example story produce a single trivial PR (1-line file change) to keep develop-story chain short.

### Rollback Plan

- **What to revert:** new file `docs/concepts/quickstart-story.md`; any practice PRD/epic/story artifacts; any practice GitHub issues, milestones, PR.
- **Revert steps:** revert PR; mark practice epic/story registry rows `CANCELLED`; close practice GH issues; delete practice milestones if empty.
- **Impact:** users lose the story quickstart; reverts doc-only addition.
- **Rollback complexity:** Moderate — practice GH issues/PR require manual close. Document the cleanup explicitly.

### Technical Constraints

- Node ≥ 20 per `package.json`.
- 60-min walkthrough budget (AC3).
- `gh` CLI required (story PRs target GitHub) — quickstart MUST verify `gh auth status` in prerequisites.

### Git History Insights

- Commit `df0b690` (fix(pipeline): harden develop-story/develop-task against live-github-test regressions) — pipeline has known regression history; quickstart should treat the chain as a black box but call out where to look if a stage stalls.
- Commit `ce297a6` (docs(evals): add live-GitHub end-to-end test walkthroughs) — there's prior art for live-GH walkthroughs; reuse phrasing/conventions.
- Commit `288288d` (refactor(skills): consolidate PRD + story-review skills) — `/review-story` is now bundled; the chain in this quickstart should reference current consolidated names.

### Project Structure Notes

No conflicts. Story file follows Story 1.1's directory shape under epic 1.

## Tasks / Subtasks

> Detailed implementation guide: [story.1.2.plan.first-story-in-60-minutes.md](story.1.2.plan.first-story-in-60-minutes.md)

- [ ] **Task 1**: File skeleton + frontmatter (AC: 1, 5)
- [ ] **Task 2**: Prerequisites + install verification section, including `gh auth status` check (AC: 2)
- [ ] **Task 3**: `/create-prd` walkthrough — tiny one-epic PRD example (AC: 2)
- [ ] **Task 4**: `/create-epic` walkthrough — single child epic (AC: 2)
- [ ] **Task 5**: `/create-story` walkthrough — single trivial story (AC: 2)
- [ ] **Task 6**: `/develop-story` walkthrough — chain pre-warn + recommended defaults (AC: 2)
- [ ] **Task 7**: Artifact review section — list 10 expected artifact types with paths (AC: 2, 3)
- [ ] **Task 8**: Cleanup section — dual path (revert + registry cancel), GH issue/PR close, milestone deletion (AC: 2)
- [ ] **Task 9**: Cross-links to `examples/` examples (AC: 4) — links resolve to canonical paths; pending if Epic 2 not landed
- [ ] **Task 10**: Walkthrough verification on macOS (AC: 3); record elapsed time; iterate if > 60 min
- [ ] **Task 11**: Static validation + status flip `draft → ready-for-review` (AC: 1, 5)

## Testing

- Static (`documentation-standards-validator`) gated before status flip.
- Walkthrough (Task 10) is the integration test.
- No automated tests.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record

_(Populated by `/develop-story`.)_

## QA Handoff

**Completed**: _(Date)_ **Developer**: _(Name)_ **Branch**: _(branch)_ **PR**: _(link)_

### Summary of Changes / Testing Instructions / Areas Requiring Special Attention / Known Limitations

_(Developer fills these in.)_

### QA Prerequisites Checklist

- [ ] All ACs implemented
- [ ] Walkthrough verified on macOS (Linux deferred per parent NFR3)
- [ ] `documentation-standards-validator` PASS
- [ ] Doc ≤ 400 lines
- [ ] Markdown link check workflow PASS
- [ ] Cross-links to Epic 2 outputs marked `(pending)` if not yet landed

## QA Report

_(Added on QA completion.)_

## Bug Reports

### Open Bugs / In QA Verification / Closed Bugs

_None._

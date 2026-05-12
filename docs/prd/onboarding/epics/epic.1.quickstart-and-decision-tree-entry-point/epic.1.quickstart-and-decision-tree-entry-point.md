---
epic_number: 1
title: "Quickstart & Decision-Tree Entry Point"
domain: "onboarding"
status: "📋 Planned"
priority: "High"
estimated_stories: 5
created: 2026-05-11
target_completion: 2026-06-08
prd_source: "docs/prd/onboarding/prd.onboarding.md"
github_issue: 73
github_url: "https://github.com/Gamaroff/agent-skills/issues/73"
---

# Epic 1: Quickstart & Decision-Tree Entry Point — Brownfield Enhancement

## Epic Goal

Land a brand-new agent-skills user in the right pipeline path within 60 seconds of installation, and let them ship a first artifact within 10 minutes.

## Epic Description

**Existing System Context:**

- Current relevant functionality: `docs/concepts/getting-started.md` (6-step install checklist), `README.md` (skill catalog + install), `docs/runbooks/` (reference-shaped guides averaging 51–274 lines).
- Technology stack: Markdown docs, Mermaid for diagrams, Bash/Node-based installers (`npx skills add`).
- Integration points: README → getting-started → runbooks (current flow); needs a guided entry that pre-dates runbook reading.

**Enhancement Details:**

- What's being added/changed: Two quickstart docs (task + story), a decision-tree page, a rewritten "Next steps" terminus on `getting-started.md`, and a README "Start here" callout.
- How it integrates: Pure additions under `docs/concepts/` plus surgical edits to existing entry-point docs. No runbook is rewritten.
- Success criteria: New user reaches `/create-task` invocation in ≤ 60 s from `README.md`; ships first task artifact set in ≤ 10 min via quickstart; ships first story in ≤ 60 min via story quickstart.

## Stories Breakdown

**Epic Story Guidelines:**

- **User-Value First:** Each story delivers a complete entry-point artifact a new user can use standalone.
- **No Forward Dependencies:** Stories 1.3 (decision tree), 1.4 (getting-started rewrite), 1.5 (README callout) reference Stories 1.1/1.2 outputs for cross-links; if 1.1/1.2 not yet landed, links go in as pending and resolve when those stories merge.
- **Incremental Setup:** No infrastructure / DB / build changes — pure-doc epic.

### Stories Overview

| Story | Status         | Priority | Description                                                                 |
| ----- | -------------- | -------- | --------------------------------------------------------------------------- |
| 1.1   | ❌ Not Started | High     | "First task in 10 minutes" quickstart at `docs/concepts/quickstart-task.md` |
| 1.2   | ❌ Not Started | High     | "First story in 60 minutes" quickstart at `docs/concepts/quickstart-story.md` |
| 1.3   | ❌ Not Started | High     | Decision tree at `docs/concepts/which-path.md` (Mermaid + prose)            |
| 1.4   | ❌ Not Started | Medium   | Rewrite `getting-started.md` terminus to link to quickstarts                |
| 1.5   | ❌ Not Started | Medium   | `README.md` "Start here" callout pointing at decision tree                  |

### Story 1.1: "First task in 10 minutes" quickstart

As a new user who just installed agent-skills,
I want a step-by-step walkthrough that produces a complete task artifact set in 10 minutes,
so that I can confirm the toolkit works on my machine without reading reference docs.

**Acceptance Criteria:**

1. New file `docs/concepts/quickstart-task.md` exists with frontmatter and lifecycle status `draft → accepted` by close.
2. Walkthrough covers: install verification → `/create-task` → `/develop-task` → reviewing artifacts → cleanup.
3. Walking the doc verbatim on a clean clone produces task spec, plan, implementation report, QA report, gate file, and DoD checklist in ≤ 10 min wall time.
4. Doc ≤ 400 lines.

### Story 1.2: "First story in 60 minutes" quickstart

As a new user who has completed the task quickstart,
I want a similarly tight walkthrough that produces a story artifact set end-to-end,
so that I can see the full PRD → epic → story → develop-story chain without committing to the 274-line `story-development.md`.

**Acceptance Criteria:**

1. New file `docs/concepts/quickstart-story.md` exists.
2. Walkthrough covers: `/create-prd` (tiny example PRD) → `/create-epic` → `/create-story` → `/develop-story` → reviewing artifacts.
3. Walking it verbatim produces all expected artifacts in ≤ 60 min.
4. Cross-links to `examples/` worked artifacts (Epic 2 outputs) — pending until Epic 2 lands.
5. Doc ≤ 400 lines.

### Story 1.3: Decision tree — which path?

As a new user uncertain whether to use task, story, hotfix, or parallel paths,
I want a single page with a decision tree mapping intent to skill,
so that I land in the right runbook without trial-and-error.

**Acceptance Criteria:**

1. New file `docs/concepts/which-path.md` exists.
2. Decision tree covers four leaves: task (`/create-task`), story (`/create-story`), hotfix (`/hotfix`), parallel (`/parallel-stories`).
3. Each leaf links to the matching runbook AND the matching quickstart (where one exists).
4. Format: Mermaid flowchart + prose fallback for accessibility.
5. Doc ≤ 250 lines.

### Story 1.4: Rewrite `getting-started.md` to terminate in quickstarts

As a new user reading `getting-started.md`,
I want the doc to end with a concrete next-action ("now follow `quickstart-task.md`"),
so that I do not bounce off the open-ended "read the runbooks" terminus.

**Acceptance Criteria:**

1. `docs/concepts/getting-started.md` final section replaced with a "Next steps" block linking prominently to `quickstart-task.md`, `quickstart-story.md`, and `which-path.md`.
2. Diff is small — install checklist body preserved verbatim.
3. Closing prose ≤ 20 lines.

### Story 1.5: README "Start here" callout

As a visitor on the repo homepage,
I want a "Start here" callout near the top of `README.md`,
so that I do not have to scan the full README to find an entry point.

**Acceptance Criteria:**

1. `README.md` gains a visually prominent "Start here" block within the first viewport (above the skill catalog list), linking to `docs/concepts/which-path.md`.
2. Existing README content not reorganized — block is inserted, not replacing structure.
3. Block ≤ 10 lines.

## Compatibility Requirements

- [x] Existing APIs remain unchanged — N/A (docs-only)
- [x] Database schema changes backward compatible — N/A (no DB)
- [x] UI changes follow existing patterns — new docs match existing tone, frontmatter schema, link conventions in `docs/concepts/`
- [x] Performance impact minimal — docs only

## Risk Mitigation

- **Primary Risk:** Wrong entry-point design causes more confusion than the status quo.
- **Mitigation:** Walkthrough validation — each quickstart is walked on a clean clone before the closing story is accepted. Decision-tree leaves cross-checked against `docs/reference/commands.md`.
- **Rollback Plan:** Revert the merge. All changes are additive except Story 1.4 (single-section rewrite of `getting-started.md` — its previous content is preserved in git history).

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria
- [ ] Walkthroughs verified on clean clone (macOS + Linux)
- [ ] `documentation-standards-validator` passes on all new + modified docs
- [ ] All cross-links resolve
- [ ] No regression in existing `getting-started.md` install checklist
- [ ] README structure preserved (callout inserted, not restructured)

## Completion Tracking

**Epic Progress**: 0% (0/5 stories complete)

**Timeline**:

- **Started**: TBD
- **Target**: 2026-06-08
- **Completed**: TBD

**Story Completion**:

- Story 1.1: ❌ Not Started
- Story 1.2: ❌ Not Started
- Story 1.3: ❌ Not Started
- Story 1.4: ❌ Not Started
- Story 1.5: ❌ Not Started

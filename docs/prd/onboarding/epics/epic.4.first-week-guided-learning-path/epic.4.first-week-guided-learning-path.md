---
epic_number: 4
title: "First-Week Guided Learning Path"
domain: "onboarding"
status: "✅ Accepted"
priority: "Medium"
estimated_stories: 5
created: 2026-05-11
target_completion: 2026-06-29
accepted: 2026-05-14
prd_source: "docs/prd/onboarding/prd.onboarding.md"
github_issue: 76
github_url: "https://github.com/Gamaroff/agent-skills/issues/76"
---

# Epic 4: First-Week Guided Learning Path — Brownfield Enhancement

## Epic Goal

Beyond Hour 1, provide a structured Day 1 → Day 4 path that takes a user from first task through parallel work and change management.

## Epic Description

**Existing System Context:**

- Current relevant functionality: `docs/runbooks/` hub (`README.md` indexes runbooks); no day-by-day onboarding curve documented.
- Technology stack: Markdown docs with checkpoint-style checklists.
- Integration points: Day 1/2 link to Epic 1 quickstarts; Day 3 links to Epic 2 messy-path artifact; Day 4 links to existing satellite runbooks (which gain Epic 3 callouts).

**Enhancement Details:**

- What's being added/changed: New files under `docs/runbooks/first-week/` (one per day) plus an index `docs/runbooks/first-week.md`.
- How it integrates: Days link out to quickstarts, runbooks, and Epic 2 examples. Cross-links resolve as upstream epics land.
- Success criteria: User completing the four days has shipped 3 tasks (Day 1), ≥ 1 story PR (Day 2), ≥ 1 `qa-gate: FAIL → PASS` cycle (Day 3), and either 2 parallel stories or 1 change proposal (Day 4) — all in their own working repo.

## Stories Breakdown

**Epic Story Guidelines:**

- **User-Value First:** Each day is independently completable; user can do Day 1 and stop without breaking the path.
- **No Forward Dependencies:** Stories 4.1–4.4 can be authored in any order; 4.5 (index) depends on at least 4.1 existing to be useful.
- **Incremental Setup:** No new directories beyond what each day needs.

**Sequencing constraint:** Story 4.3 references Epic 2.3 (messy-path artifact); the link can be authored as pending and resolves when Epic 2.3 lands. Story 4.4 references satellite runbooks with Epic 3.2 callouts; similarly resolves when Epic 3.2 lands.

### Stories Overview

| Story | Status         | Priority | Description                                                                    |
| ----- | -------------- | -------- | ------------------------------------------------------------------------------ |
| 4.1   | ❌ Not Started | High     | "Day 1: Tasks" guided checklist at `docs/runbooks/first-week/day-1-tasks.md`   |
| 4.2   | ❌ Not Started | High     | "Day 2: Stories" guided walkthrough at `docs/runbooks/first-week/day-2-stories.md` |
| 4.3   | ❌ Not Started | Medium   | "Day 3: Messy path" walkthrough using Epic 2.3 artifact                        |
| 4.4   | ❌ Not Started | Medium   | "Day 4: Parallel + change-mgmt" walkthrough                                    |
| 4.5   | ❌ Not Started | Medium   | First-week index at `docs/runbooks/first-week.md` linking all 4 days           |

### Story 4.1: Day 1 — Tasks

As a new user on Day 1,
I want a guided checklist that walks me through running 2–3 tasks,
so that I internalize the task pipeline before tackling the story pipeline.

**Acceptance Criteria:**

1. `docs/runbooks/first-week/day-1-tasks.md` exists with frontmatter and checkpoints (boxes the user ticks).
2. Day 1 spans the task quickstart + two follow-up tasks of progressive complexity.
3. Completion criteria measurable: by end of Day 1, user should have 3 task artifact sets in their working repo.
4. Doc ≤ 300 lines.

### Story 4.2: Day 2 — Stories

As a new user on Day 2,
I want a guided story walkthrough,
so that I shift from task pipeline to story pipeline confidently.

**Acceptance Criteria:**

1. `docs/runbooks/first-week/day-2-stories.md` exists.
2. Day 2 spans the story quickstart + one follow-up story.
3. Completion criteria: user has at least 1 fully-developed story PR in their working repo.
4. Doc ≤ 300 lines.

### Story 4.3: Day 3 — Review concerns and QA gate failures

As a new user on Day 3,
I want to deliberately reproduce a QA-gate failure and recover from it,
so that the "messy path" stops being scary.

**Acceptance Criteria:**

1. `docs/runbooks/first-week/day-3-messy-path.md` exists.
2. Day 3 references the Epic 2.3 worked messy-path artifact and walks the user through reproducing the same shape of failure-and-recovery on their own work.
3. Completion criteria: user has at least one `qa-gate: FAIL` artifact followed by a `qa-gate: PASS` revision in their repo.
4. Doc ≤ 300 lines.

### Story 4.4: Day 4 — Parallel work + change management

As a new user on Day 4,
I want to try parallel stories and the change-management runbook,
so that I am equipped for week-2+ scenarios.

**Acceptance Criteria:**

1. `docs/runbooks/first-week/day-4-parallel.md` exists.
2. Day 4 cross-links to `create-parallel-stories.md` and `change-management.md` (both with Epic 3.2 callouts in place).
3. Completion criteria: user has either (a) two stories in parallel worktrees or (b) one change-management Sprint Change Proposal in their repo.
4. Doc ≤ 300 lines.

### Story 4.5: First-week index

As a new user planning their onboarding,
I want a single index page listing the four days with completion criteria,
so that I can plan my week.

**Acceptance Criteria:**

1. `docs/runbooks/first-week.md` exists at runbook level (not nested in `first-week/`).
2. Index lists Day 1–Day 4 with one-line description and completion criterion each.
3. Index links to all four day docs and to the relevant Epic 1 quickstarts.
4. Doc ≤ 100 lines.

## Compatibility Requirements

- [x] Existing APIs remain unchanged — N/A (docs-only)
- [x] Database schema changes backward compatible — N/A
- [x] UI changes follow existing patterns — day docs match runbook tone and frontmatter
- [x] Performance impact minimal — docs only

## Risk Mitigation

- **Primary Risk:** Day-level docs duplicate content from anchor runbooks (`task-development.md`, `story-development.md`).
- **Mitigation:** Per-story IV: no content duplicated from anchor runbooks; days are guided sequences *over* them, not rewrites.
- **Rollback Plan:** Revert PR. All Epic 4 content is net-new files under `docs/runbooks/first-week/` plus a single hub link from `docs/runbooks/README.md`.

## Definition of Done

- [ ] All 5 stories completed
- [ ] No anchor-runbook content duplicated in day docs
- [ ] All cross-links to Epic 1 / Epic 2 / Epic 3 outputs resolve
- [ ] `documentation-standards-validator` passes
- [ ] `docs/runbooks/README.md` updated with a single inbound link to `first-week.md`

## Completion Tracking

**Epic Progress**: 0% (0/5 stories complete)

**Timeline**:

- **Started**: TBD
- **Target**: 2026-06-29
- **Completed**: TBD

**Story Completion**:

- Story 4.1: ❌ Not Started
- Story 4.2: ❌ Not Started
- Story 4.3: ❌ Not Started
- Story 4.4: ❌ Not Started
- Story 4.5: ❌ Not Started

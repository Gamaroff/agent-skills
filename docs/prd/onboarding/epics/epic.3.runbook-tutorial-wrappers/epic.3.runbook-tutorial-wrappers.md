---
epic_number: 3
title: "Runbook Tutorial Wrappers"
domain: "onboarding"
status: "📋 Planned"
priority: "Medium"
estimated_stories: 3
created: 2026-05-11
target_completion: 2026-06-15
prd_source: "docs/prd/onboarding/prd.onboarding.md"
github_issue: 75
github_url: "https://github.com/Gamaroff/agent-skills/issues/75"
---

# Epic 3: Runbook Tutorial Wrappers — Brownfield Enhancement

## Epic Goal

Make existing runbooks safer to land in cold — without rewriting them — by adding "Before you start", "Is this the right runbook?", and "Common first-time errors" sections.

## Epic Description

**Existing System Context:**

- Current relevant functionality: `docs/runbooks/` contains anchor runbooks (`story-development.md` ~274 lines, `task-development.md` ~183 lines) and satellites (`hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, `change-management.md` — 51–96 lines each).
- Technology stack: Markdown, with cross-references between runbooks and standards docs.
- Integration points: Runbooks link to each other, to `docs/standards/`, and to `docs/reference/`. No automated rendering pipeline.

**Enhancement Details:**

- What's being added/changed: Prepend "Before you start" to anchor runbooks; prepend "Is this the right runbook?" callouts to satellites; append "Common first-time errors" to anchors.
- How it integrates: Purely additive — existing body content stays character-identical. New sections wrap, do not rewrite.
- Success criteria: Cold reader on any runbook can determine within 30 seconds (a) whether they're in the right place and (b) what prerequisites they need.

## Stories Breakdown

**Epic Story Guidelines:**

- **User-Value First:** Each story improves a real-world reader landing pattern.
- **No Forward Dependencies:** All 3 stories are independent — they touch different runbooks and different section positions (top vs. bottom).
- **Incremental Setup:** No new files. All edits are surgical insertions into existing files.

**Parallelism:** All 3 stories can be developed concurrently — they touch non-overlapping files or non-overlapping sections of the same files.

### Stories Overview

| Story | Status         | Priority | Description                                                                                  |
| ----- | -------------- | -------- | -------------------------------------------------------------------------------------------- |
| 3.1   | ❌ Not Started | High     | "Before you start" prereq sections at top of anchor runbooks                                 |
| 3.2   | ❌ Not Started | High     | "Is this the right runbook?" callouts at top of satellite runbooks                           |
| 3.3   | ❌ Not Started | Medium   | "Common first-time errors" troubleshooting sections at end of anchor runbooks                |

### Story 3.1: "Before you start" for anchor runbooks

As a new user opening `story-development.md` or `task-development.md` cold,
I want a prerequisite section at the top telling me what to know first,
so that I don't bounce off the 274-line body.

**Acceptance Criteria:**

1. Both `docs/runbooks/story-development.md` and `docs/runbooks/task-development.md` gain a "Before you start" section between title and existing body.
2. Each section lists: (a) which quickstart to do first, (b) which standards docs to skim, (c) when to use a different runbook instead.
3. Each section ≤ 30 lines.
4. Existing body content character-identical to pre-change.

### Story 3.2: "Is this the right runbook?" callouts for satellites

As a new user landing on `hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, or `change-management.md`,
I want a top-of-page callout that confirms (or redirects) my path,
so that I don't follow a runbook that does not match my situation.

**Acceptance Criteria:**

1. Each of the four satellite runbooks gains a callout block at the top: "Use this if X. Use [Y runbook] instead if Z."
2. Callouts cross-reference `which-path.md` (Epic 1.3 output — link goes in even if 1.3 not yet merged; resolves when it does).
3. Each callout ≤ 10 lines.
4. Existing body untouched.

### Story 3.3: "Common first-time errors" troubleshooting section

As a new user hitting a confusing error during a runbook walkthrough,
I want a troubleshooting section at the end of the anchor runbooks,
so that I can self-serve before asking for help.

**Acceptance Criteria:**

1. Both anchor runbooks gain a "Common first-time errors" section at the end.
2. Each section lists at least 5 errors with symptom, cause, fix.
3. Errors sourced from real friction observed during this PRD's dogfood run — record them as encountered.
4. Each section ≤ 60 lines.

## Compatibility Requirements

- [x] Existing APIs remain unchanged — N/A (docs-only)
- [x] Database schema changes backward compatible — N/A
- [x] UI changes follow existing patterns — new sections use consistent heading levels and tone matching surrounding runbook body
- [x] Performance impact minimal — docs only

## Risk Mitigation

- **Primary Risk:** Accidentally modifying existing runbook body content while inserting wrappers.
- **Mitigation:** Per-story IV: existing body character-identical to pre-change, verified by diff inspection. PR review enforces it.
- **Rollback Plan:** Revert PR — wrappers come out cleanly since they're additive.

## Definition of Done

- [ ] All 3 stories completed
- [ ] No existing runbook body content modified (only wrappers added)
- [ ] All inbound links to modified runbooks still resolve at the same anchors
- [ ] `documentation-standards-validator` passes
- [ ] Story 3.3 troubleshooting items reference real, reproducible errors observed during dogfood run

## Completion Tracking

**Epic Progress**: 0% (0/3 stories complete)

**Timeline**:

- **Started**: TBD
- **Target**: 2026-06-15
- **Completed**: TBD

**Story Completion**:

- Story 3.1: ❌ Not Started
- Story 3.2: ❌ Not Started
- Story 3.3: ❌ Not Started

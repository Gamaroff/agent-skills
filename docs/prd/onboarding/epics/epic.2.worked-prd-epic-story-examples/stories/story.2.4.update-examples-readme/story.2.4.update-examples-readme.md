---
id: story.2.4.update-examples-readme
title: "Story 2.4: Update examples/README.md — remove caveat, cross-link PRD/epic/story examples"
type: story
status: draft
priority: medium
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

# Story 2.4: Update examples/README.md

**Status**: Draft

## Story Statement

**As a** visitor to `examples/`,
**I want** the README to point at PRD, epic, and story examples alongside the existing task examples,
**so that** the "no story/epic/PRD examples live here" caveat is removed.

## Acceptance Criteria

1. `examples/README.md` updated: the explicit caveat ("No story, epic, or PRD examples live here") is removed; new sections added for PRD / epic / story examples with the same depth as the existing task walkthrough.
2. Skill-to-artifact lookup table extended to include `create-prd`, `create-epic`, `create-story`, `develop-story`.
3. Featured walkthrough remains task.6 but a parallel "story walkthrough" entry is added pointing at the canonical story produced by this PRD's run.

## Dev Notes

### Previous Story Insights

- Stories 2.1, 2.2, 2.3 produced the link targets (`examples/prd-example/`, `examples/epic-examples/`, `examples/story-messy-path/`). This story must sequence AFTER all three.
- The existing `examples/README.md` was rewritten earlier in the session — it has a clear structure (Start-here walkthrough, artifact reference, look-up by skill, recency, caveats). New sections extend, not replace.

### File Locations

- **Modified:** `examples/README.md`. [Source: live file.]
- **Linked:** `examples/prd-example/`, `examples/epic-examples/`, `examples/story-messy-path/` (Stories 2.1–2.3 outputs).

### Testing Requirements

- Static validator.
- Link check (all new outbound links resolve).
- Diff inspection: existing task-walkthrough content preserved verbatim.

### Manual Testing Steps

**Verification steps:**
- **AC1:** `grep -i "no story" examples/README.md` returns 0 matches; new PRD/epic/story sections present.
- **AC2:** `grep -E "create-prd|create-epic|create-story|develop-story" examples/README.md` returns matches in the skill→artifact lookup section.
- **AC3:** "Story walkthrough" entry alongside task.6 walkthrough; both present.

**Edge cases:**
- If Story 2.3 was descoped (no real FAIL), the README must say so explicitly under "Story walkthrough" rather than linking to a nonexistent messy-path dir. Mark `(messy-path example pending future PRD run)` in that case.
- The existing "What we don't have yet" section MUST be deleted, not edited — removing it is the value of this story.

### Rollback Plan

- **What to revert:** README.md edit.
- **Revert steps:** revert PR.
- **Impact:** caveat returns; new sections gone.
- **Rollback complexity:** Simple.

### Technical Constraints

- Diff is additive + one explicit deletion (the caveat).
- New section depth parity with existing task walkthrough.

### Git History Insights

- `examples/README.md` was rewritten in commit ~`e81c8be`-adjacent (within session). Recent state is known; surgical edit safe.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.4.plan.update-examples-readme.md](story.2.4.plan.update-examples-readme.md)

- [ ] **Task 1**: Read current `examples/README.md`; confirm Stories 2.1–2.3 outputs landed (AC: pre-req)
- [ ] **Task 2**: Remove the caveat paragraph; replace with positive cross-reference (AC: 1)
- [ ] **Task 3**: Add "PRD example", "Epic examples", "Story walkthrough" sections (AC: 1)
- [ ] **Task 4**: Extend skill→artifact lookup table (AC: 2)
- [ ] **Task 5**: Insert story-walkthrough entry alongside task.6 (AC: 3)
- [ ] **Task 6**: Handle messy-path-descoped case if applicable (AC: 1)
- [ ] **Task 7**: Diff verification (task-walkthrough content preserved) + link check + static validator (AC: all)

## Testing

- Diff inspection + link check + static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

_(Populated by `/develop-story` and downstream.)_

### QA Prerequisites Checklist

- [ ] Caveat removed (grep returns 0)
- [ ] 4 new skill entries in lookup table
- [ ] Story walkthrough entry parallel to task.6
- [ ] All outbound links resolve
- [ ] Existing task-walkthrough content preserved (diff verified)

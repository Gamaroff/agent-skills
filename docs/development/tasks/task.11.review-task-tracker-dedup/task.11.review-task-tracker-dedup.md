---
id: task.11
title: "Add tracker-issue dedup guard in review-task and review-story"
type: task
category: refactoring
priority: Medium
status: 📋 Planned
created: 2026-05-06
assignee: TBD
effort: 0.5 day
depends_on: —
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #5)
---

# Task 11 — Add tracker-issue dedup guard in review-task / review-story

## 1. Overview

`create-task` (Step 4.5) creates a tracker issue (Jira or GitHub) and writes `jira_key` / `github_issue` to frontmatter. `review-task` (Step 2 around line 416) will **also** create a tracker issue if `jira_key` is missing — with no check that one was previously created and the field was simply dropped during a manual edit. Same risk exists in `review-story`. A dedup guard is needed.

**Scope**: before creating a tracker issue, search the tracker for an existing one matching the task/story title or ID. Link instead of create when found.

**Key deliverables**:

- Pre-create search step in both review skills
- Frontmatter repaired (re-link existing issue) rather than duplicate
- Clear log entry distinguishing "linked existing" from "created new"

**Expected outcome**: zero duplicate tracker issues from review skills, even when frontmatter has been hand-edited.

## 2. Motivation

**Current Problems**:

- Manually authored tasks (no `create-task` run) trigger duplicate-issue creation when reviewed twice
- Frontmatter edits that drop `jira_key` cause silent re-creation
- No human signal that a duplicate was prevented (or wasn't)

**Benefits**:

- Fewer junk issues cluttering trackers
- Safer to re-run review skills mid-project
- Better fit for projects that author tasks outside `create-task`

## 3. Technical Background

**Affected lines**:

- `skills/review-task/SKILL.md` — around line 416 (Jira create), line 463 (GitHub create)
- `skills/review-story/SKILL.md` — corresponding section (verify during implementation)

**Search criteria**:

- Jira: `jql=summary ~ "[Task {id}] {title}" AND project={JIRA_PROJECT_KEY}` via `searchJiraIssuesUsingJql`
- GitHub: `gh issue list --search "in:title \"[Task {id}]\"" --state all --json number,url`

**Decision rule**:

1. If frontmatter has `jira_key` / `github_issue` → use it, skip create
2. Else search by title; if exactly one match → link by writing frontmatter, skip create
3. Else (zero or multiple matches) → fall through to create (existing behaviour)

## 4. Scope

**In Scope**:

- ✅ Pre-create search step in `review-task` and `review-story`
- ✅ Frontmatter write-back when an existing issue is linked
- ✅ Log message distinguishing "linked existing #N" from "created #M"

**Out of Scope**:

- ❌ Search/link in `create-task` itself (that skill is "create from scratch")
- ❌ Auto-merging duplicates that already exist

## 5. Breaking Changes

None. Existing happy-path (frontmatter has `jira_key` / `github_issue`) is unchanged.

## 6. Implementation Plan

### Phase 1 — review-task dedup (Risk: Medium)

Files:

- `skills/review-task/SKILL.md`

Changes:

- [ ] Add a "Pre-create existing-issue search" step before the Jira create block (~line 416)
- [ ] Add the same step before the GitHub create block (~line 463)
- [ ] On exactly-one-match: write frontmatter, log "Linked existing tracker issue #N", skip create
- [ ] On zero or multiple: log and proceed to create (existing logic)

### Phase 2 — review-story dedup (Risk: Medium)

Files:

- `skills/review-story/SKILL.md`

Changes:

- [ ] Mirror the review-task dedup logic in the corresponding section
- [ ] Use story title pattern `[Story {epic}.{story}] {title}` for the search

### Phase 3 — Documentation (Risk: Low)

Files:

- Both skills

Changes:

- [ ] Add a "Tracker dedup" subsection explaining the lookup order and write-back behaviour

## 7. Files Summary

**Modified**:

- `skills/review-task/SKILL.md`
- `skills/review-story/SKILL.md`

## 8. Testing Strategy

- **Manual** (GitHub): create a task, manually delete `github_issue` from frontmatter, run `/review-task`. Confirm existing issue is linked, not duplicated.
- **Manual** (Jira): same scenario for a Jira project.
- **Multiple-match case**: create two issues with the same title, run review-task; confirm fall-through to "create new" with a warning logged.
- **Static**: `grep -n "createJiraIssue\|gh issue create" skills/review-*/SKILL.md` should be preceded by a search step.

## 9. Success Criteria

**Functional**:

- [ ] Re-running review-task / review-story on a manually-authored task does not duplicate tracker issues
- [ ] When linked, frontmatter is repaired with the discovered issue ID/key
- [ ] Multiple-match case logs a warning and falls through to create

**Code Quality**:

- [ ] Search logic mirrors `ensure-epic-github-issue` / `ensure-epic-jira-issue` patterns where applicable

## 10. Risk Assessment

**Medium Risk** — Title-based search false positives:

- Mitigation: require exact `[Task {id}]` prefix; fall through to create on multi-match.

**Low Risk** — Tracker search rate limits / outage:

- Mitigation: on search failure, log warning and fall through to create (current behaviour).

## 11. Rollback Plan

**Immediate (< 30 min)**: revert the search-step additions; review skills resume current behaviour. Frontmatter writes are idempotent.

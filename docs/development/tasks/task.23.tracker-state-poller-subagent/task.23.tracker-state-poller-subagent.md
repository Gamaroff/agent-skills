---
id: task.23
title: "Add shared tracker state poller Explore subagent"
type: task
category: infrastructure
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: —
github_issue: 41
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #8)
---

# Task 23 — Shared tracker state poller subagent

**Status**: Planned

> Detailed implementation guide: [task.23.plan.tracker-state-poller-subagent.md](task.23.plan.tracker-state-poller-subagent.md)

## 1. Overview

Steps 4 (create-pr), 5 (qa-story), and 7 (finalise) each shell out to `gh`, Bitbucket REST, or Jira MCP to check PR/issue/board state. Outputs land in main context — multiple JSON blobs, often hundreds of lines.

**Scope**: encapsulate tracker polling in a shared read-only Explore subagent that returns compact `{pr_state, issue_state, board_column, comments_count}` JSON. Reused across pipeline steps.

## 2. Motivation

- Repeated noisy CLI/API outputs in main context
- Inconsistent fields surfaced across steps
- Single helper improves resilience to platform-specific quirks

## 3. Technical Background

**Current**: ad-hoc `gh pr view --json ...`, `gh issue view --json ...`, Jira MCP calls scattered across step files.

**Target**: shared resource `shared/resources/tracker-state-poller-prompt.md` — Explore prompt that uses `resolve-platform.sh`, runs the right CLI/MCP based on TRACKER/VCS, returns compact JSON. Single point of maintenance.

## 4. Scope

**In**: read-only state polling.
**Out**: tracker mutations (issue close, comment post, transition) — still in main with their existing best-effort wrappers.

## 5. Breaking Changes

None — additive; existing inline polling can coexist during migration.

## 6. Implementation Plan

### Phase 1 — Define output schema (Low)
- [ ] `{tracker, vcs, pr: {url,state,reviews}, issue: {key,state,labels,column}, comments_count}`

### Phase 2 — Author Explore prompt (Medium)
- [ ] Source `resolve-platform.sh`
- [ ] Branch on TRACKER (jira/github), VCS (github/bitbucket)
- [ ] Compact JSON-only output

### Phase 3 — Migrate callers (Medium)
- [ ] Replace inline polls in step-4, step-5-6, step-7 references
- [ ] Keep mutation paths inline

### Phase 4 — Validation (Medium)
- [ ] GitHub-only flow
- [ ] Jira+Bitbucket flow
- [ ] Mixed (Jira tracker + GitHub vcs)

## 7. Files Summary

**Modified**:
1. `skills/develop-story/references/develop-pipeline-step-4-create-pr.md`
2. `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md`
3. `skills/develop-story/references/develop-pipeline-step-7-finalise.md`

**New**:
4. `shared/resources/tracker-state-poller-prompt.md`

## 8. Testing Strategy

- Real run on each platform combo
- Simulate `gh` rate limit: confirm graceful failure surfaces in JSON

## 9. Success Criteria

**Functional**:
- [ ] All read-only tracker polls go through shared subagent
- [ ] Mutations remain inline
- [ ] Output schema stable across platforms

**Performance**:
- [ ] Tracker-poll main tokens reduced ≥50% per step
- [ ] No additional platform-specific code in step files

**Quality**:
- [ ] All platform combos covered in validation

**Migration**:
- [ ] None — wrapper pattern, callers updated in same task

## 10. Risk Assessment

**Medium**: subagent abstraction hides API errors. Mitigation: include `errors: []` field in JSON; main checks before trusting state.

**Low**: platform drift (gh API change). Mitigation: shared resource is single point of fix.

## 11. Rollback Plan

Revert step references to inline polls. Shared resource can remain as dead-letter without harm.

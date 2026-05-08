---
id: task.23.plan
title: "Implementation Plan: tracker state poller subagent"
type: plan
task-ref: task.23.tracker-state-poller-subagent.md
---

# Implementation Plan — Task 23

> Requirements and success criteria: [task.23.tracker-state-poller-subagent.md](task.23.tracker-state-poller-subagent.md)

## Overview

Single shared Explore prompt encapsulates platform-aware read-only polling. Returns compact JSON.

## Phase 1 — Output schema

```json
{
  "tracker": "jira|github",
  "vcs": "github|bitbucket",
  "pr": {"url": "...", "state": "open|merged|closed", "reviews_count": 0, "approved": false},
  "issue": {"key": "PROJ-123", "state": "...", "labels": ["..."], "column": "..."},
  "comments_count": 0,
  "errors": []
}
```

## Phase 2 — Poller prompt

`shared/resources/tracker-state-poller-subagent.md`:

```
Source shared/resources/resolve-platform.sh.
Inputs: --pr-number, --issue-key (whichever applies)

If TRACKER=jira: use Atlassian MCP to fetch issue (state, labels, parent, status).
If TRACKER=github: `gh issue view <key> --json state,labels,projectItems`.
If VCS=github: `gh pr view <num> --json state,reviewDecision,reviews`.
If VCS=bitbucket: curl REST API for PR.

Aggregate; return JSON matching schema. Append API errors to `errors` array; never throw.
```

## Phase 3 — Migrate callers

Replace inline poll calls in:
- `shared/resources/develop-pipeline-step-4-create-pr.md` — post-PR state check
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — gate-cycle PR/issue checks
- `shared/resources/develop-pipeline-step-7-finalise.md` — pre-close polling

Mutations (close, comment, transition) stay inline.

## Phase 4 — Validation

Run pipeline on:
- GitHub-only repo
- Jira tracker + Bitbucket vcs
- Jira tracker + GitHub vcs

Verify JSON consistent across platforms.

## Key References

- `shared/resources/resolve-platform.sh`
- `shared/resources/subagent-summary-artifact.md` (task.26 — compact-JSON pattern)
- Existing `gh pr view`, Atlassian MCP tools listed in deferred tools

## Testing Approach

1. Each platform combo end-to-end
2. Force `gh` rate-limit 403 → confirm `errors[]` populated, main proceeds
3. Confirm mutations still happen inline (not regressed into subagent)

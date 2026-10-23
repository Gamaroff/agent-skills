# Runbook — Sprint Cycle

> **Audience:** teams running sprints with this library.

End-to-end activities for a sprint that uses agent-skills as the implementation engine. This runbook is a thin coordination layer — most of the work is delegated to the [Story Development Runbook](./story-development.md) and [QA Flow Runbook](./qa-flow.md).

## When to use this runbook

- You're a scrum master or tech lead planning a sprint.
- You want a checklist mapping sprint ceremonies to skill invocations.
- You're picking up the library mid-sprint and need to know what to run when.

## Phases

```mermaid
flowchart LR
    A[Sprint Planning] --> B[Development]
    B --> C[Review]
    C --> D[Completion]
    D --> E[Retrospective]
```

## Phase 1 — Sprint planning

For each story going into the sprint:

```
1. /create-story                    → next story for the active epic
2. /review-story --validate         → GO/NO-GO readiness score (non-interactive)
   OR /review-story                 → interactive review with clarifying questions
```

Validate the whole backlog before development starts. A story that scores below the readiness threshold should be deferred or reworked.

On Jira, [`jira-sprint-manager`](../../skills/jira-sprint-manager/SKILL.md) starts the sprint, adds or removes issues, and checks for unestimated ones.

## Phase 2 — Development

For each story:

```
3. /develop-story <story-path>   → full orchestrated lifecycle (recommended)
```

Or, if you need manual control: see [Story Development Runbook — Phase D](./story-development.md#phase-d--implementation-develop-story).

Run testing skills appropriate to your stack as part of the loop (e.g. `testing-setup-react-native`, `testing-setup-nestjs`).

On Jira, [`jira-standup-auditor`](../../skills/jira-standup-auditor/SKILL.md) compiles each day's async standup update from recent Jira activity and git history.

## Phase 3 — Review

```
4. /qa-story <story-path>             → if not already run by develop-story
5. /execute-checklist <dod-checklist> → if your team requires manual DoD validation
```

`develop-story` runs `qa-story` and DoD validation automatically — invoke separately only for stories developed outside the orchestrator.

On Jira, [`jira-sprint-review-prep`](../../skills/jira-sprint-review-prep/SKILL.md) collects the completed increments, checks them against the Definition of Done, flags scope creep and unfinished items, and formats the Sprint Review agenda or release notes.

## Phase 4 — Completion

```
6. /commit-changes        → finalise any uncommitted work
7. [Deploy]               → your existing release process
8. /sync-jira-story       → if Jira is the tracker and develop-story didn't already sync
```

On Jira, [`jira-sprint-manager`](../../skills/jira-sprint-manager/SKILL.md) closes the sprint and moves leftover scope to the backlog or the next sprint.

## Phase 5 — Retrospective

On Jira, [`jira-sprint-retrospective`](../../skills/jira-sprint-retrospective/SKILL.md) writes the retrospective document from Jira and git: committed work against work found mid-sprint, and carry-over in both directions.

Use [`autoskill`](../../skills/autoskill/SKILL.md) to extract lessons from the sprint's transcripts and update relevant skills, and [`remember-insight`](../../skills/remember-insight/SKILL.md) to record durable preferences.

## See also

- [Story Development Runbook](./story-development.md)
- [QA Flow Runbook](./qa-flow.md)
- [Jira Publish Runbook](./jira-publish.md)
- [`create-parallel-stories` SKILL.md](../../skills/create-parallel-stories/SKILL.md) — when stories can run in parallel worktrees

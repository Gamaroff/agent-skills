---
name: first-week
description: First-week onboarding index — four structured days to learn the agent-skills task and story pipelines end-to-end.
type: guide
status: draft
version: 0.1.0
created: 2026-05-13
---

# First-Week Onboarding Index

> Structured four-day path for a new agent-skills user. Each day is a self-contained runbook; complete them in order.

## Before you start

If this is your first time using agent-skills, read the quickstarts first:

- [Quickstart: Tasks](../concepts/quickstart-task.md)
- [Quickstart: Stories](../concepts/quickstart-story.md)

They cover the core concepts (task pipeline, story pipeline, Phase 0 prompts) you will need before Day 1.

> **No tracker write token for the agent?** These walkthroughs assume `access: full` — the default,
> where the agent moves the board itself. If your org won't let the locally running agent write to
> Jira or GitHub Issues, read [Restricted tracker access](../concepts/restricted-access.md) before
> Day 1 and pick a model with [Which access model?](../concepts/which-access.md). Every day still
> completes under a restricted model — but board moves and issue writes land in a committed
> **handover checklist** instead of on the board, so end each day by working the checklist (or
> running `/tracker-reconcile`) rather than waiting for cards that will not move on their own.

## The week at a glance

| Day | What you do | Done when… |
|-----|-------------|------------|
| [Day 1 — Tasks](first-week/day-1-tasks.md) | Ship three real tasks end-to-end through the task pipeline | 3 tasks accepted; `docs/tasks/` has 3 new artifact sets and task-registry.md is updated |
| [Day 2 — Stories](first-week/day-2-stories.md) | Ship at least one story through the full PRD → epic → story → develop-story chain | 1 story PR merged to the epic branch; story status `accepted` |
| [Day 3 — Messy path](first-week/day-3-messy-path.md) | Deliberately reproduce a QA-gate failure and recover using `qa-fix` | 1 gate with `FAIL` status and 1 gate with `PASS` status from the same story |
| [Day 4 — Parallel + change-mgmt](first-week/day-4-parallel.md) | Run parallel stories via git worktrees **or** write a Sprint Change Proposal | Parallel: 1 worktree PR merged; Change-mgmt: Sprint Change Proposal committed |

## After the week

Day 4 closes the structured first-week path. From week 2 onwards you use the same pipelines for real work — stories, parallel or serial, with `/develop-story` running end-to-end. See the full [Runbooks index](./README.md) for the complete skill catalogue.

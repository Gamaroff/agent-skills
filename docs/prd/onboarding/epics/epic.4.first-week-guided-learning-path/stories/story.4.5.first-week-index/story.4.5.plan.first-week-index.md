---
id: story.4.5.plan
title: "Implementation Plan: First-week index"
type: plan
story-ref: story.4.5.first-week-index.md
---

# Implementation Plan: First-week index

> Requirements: [story.4.5.first-week-index.md](story.4.5.first-week-index.md)

## Overview

Hub doc + single inbound link. Closes the loop on Epic 4.

## Index file content

```markdown
---
name: first-week
description: Four-day guided onboarding path. Day 1 tasks → Day 2 stories → Day 3 messy path → Day 4 parallel + change management.
type: guide
status: draft
version: 0.1.0
created: 2026-05-XX
---

# First-week onboarding

> A structured four-day curriculum for new agent-skills users. Each day is independently completable.

## Before you start

- [ ] You've installed agent-skills (see [`docs/concepts/getting-started.md`](../concepts/getting-started.md)).
- [ ] You've decided which path matches your work (see [`docs/concepts/which-path.md`](../concepts/which-path.md)).
- [ ] You have a clean clone of the repo ready.

## The week at a glance

| Day | Topic | Completion criterion |
|---|---|---|
| [Day 1](./first-week/day-1-tasks.md) | Tasks | 3 task artifact sets shipped through `/develop-task` |
| [Day 2](./first-week/day-2-stories.md) | Stories | ≥ 1 story PR open or merged via `/develop-story` |
| [Day 3](./first-week/day-3-messy-path.md) | Messy path | ≥ 1 `qa-gate: FAIL` then `qa-gate: PASS` pair in your repo |
| [Day 4](./first-week/day-4-parallel.md) | Parallel + change-mgmt | Either 2 parallel-story PRs OR 1 Sprint Change Proposal |

Day 3 is recommended but optional. Day 4 can follow Day 2 directly if you skip Day 3.

## Quickstart shortcuts (if you've already shipped a task or a story)

- Shipped a task? Skip Day 1 → start at [Day 2](./first-week/day-2-stories.md).
- Shipped a story already? Skip Day 1–2 → start at [Day 3](./first-week/day-3-messy-path.md) for the messy path.

## After the week

Once you've completed the days you want:

- Use [`docs/runbooks/task-development.md`](./task-development.md) and [`story-development.md`](./story-development.md) as your reference anchors.
- For specific scenarios: [`hotfix.md`](./hotfix.md), [`bug-fix.md`](./bug-fix.md), [`create-parallel-stories.md`](./create-parallel-stories.md), [`change-management.md`](./change-management.md).
- All standards live in [`docs/standards/`](../standards/).
```

≈ 40 lines. Well under 100.

## Inbound link insertion (runbooks/README.md)

Find the runbook list in `docs/runbooks/README.md`; insert a top-of-list entry:

```markdown
- **[First-week onboarding](./first-week.md)** — guided four-day curriculum for new users. Start here.
```

Just one line. Insertion only — diff verified.

## Task-by-Task Implementation Guide

### Tasks 1–4 — Write index

Per skeleton above.

### Task 5 — Inbound link

Edit `docs/runbooks/README.md` with precise `old_string` (the line above the runbook list) + `new_string` (same + first-week entry).

### Task 6 — Diff verify

```bash
git diff docs/runbooks/README.md
```

Expected: single insertion. No other edits.

### Task 7 — Validation

Static + link check + line count.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Day docs not yet landed | Medium | Medium | Sequence 4.5 last; markdown link check tolerates if dir exists |
| README inbound link displaces existing structure | Low | Medium | Diff verify (Task 6) |
| Day descriptions drift from actual day-doc content | Low | Low | Use day-doc titles verbatim in the table |

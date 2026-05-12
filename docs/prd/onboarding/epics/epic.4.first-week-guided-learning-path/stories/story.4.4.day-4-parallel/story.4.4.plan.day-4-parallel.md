---
id: story.4.4.plan
title: "Implementation Plan: Day 4 — Parallel + change-mgmt"
type: plan
story-ref: story.4.4.day-4-parallel.md
---

# Implementation Plan: Day 4 — Parallel + change-mgmt

> Requirements: [story.4.4.day-4-parallel.md](story.4.4.day-4-parallel.md)

## Overview

Day-doc with two optional branches. User picks one.

## Doc skeleton

```markdown
# Day 4 — Parallel work + change management

**Status:** Draft

> Today is choose-your-own: pick **branch (a)** to try parallel stories with git worktrees, or **branch (b)** to write a Sprint Change Proposal. Either prepares you for week-2+.

## Prerequisites

- [ ] Completed [Day 2](./day-2-stories.md) (Day 3 is recommended but optional)

## `git worktree` primer (if you've not used it)

```bash
git worktree add ../agent-skills-feat-x feature/feat-x
cd ../agent-skills-feat-x
# Now you have two checkouts of the same repo, two branches, two parallel pipelines.
```

Remove a worktree when done: `git worktree remove ../agent-skills-feat-x`.

## Branch (a) — Parallel stories (~3 hours)

- [ ] Read [`docs/runbooks/parallel-stories.md`](../parallel-stories.md). The Epic 3.2 callout at the top tells you whether this is the right fit.
- [ ] Invoke `/parallel-stories` to scope 2 stories that can run in parallel.
- [ ] Open 2 git worktrees, one per story branch.
- [ ] Run `/develop-story` in each.
- [ ] Confirm both PRs open without conflict.

## Branch (b) — Change management (~2 hours)

- [ ] Read [`docs/runbooks/change-management.md`](../change-management.md).
- [ ] Identify a pivot worth documenting (real or simulated — e.g., "Day 5 PRD scope grew unexpectedly").
- [ ] Invoke `/correct-course` (or the `change-management` skill directly).
- [ ] Follow the `change-checklist` 6-section structure.
- [ ] Produce a Sprint Change Proposal artifact in your repo.

## End of day — Verify

- [ ] Branch (a): two PRs in parallel, both open. **OR**
- [ ] Branch (b): one Sprint Change Proposal markdown file committed.

## What you learned

- Branch (a): how git worktrees + multiple develop-story chains coexist.
- Branch (b): how to recover from a scope/plan change without abandoning the pipeline.

## Next: [First-week index](../first-week.md) (Story 4.5 output — closes the loop)
```

≈ 60 lines.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| User unfamiliar with git worktree | Medium | Low | Primer in doc |
| Branch (a) — parallel stories conflict on shared files | Medium | Medium | `/parallel-stories` skill scopes for non-overlapping work |
| Branch (b) — `/correct-course` requires a real pivot to feel meaningful | Medium | Low | Allow simulated pivot for the practice run |

---
name: day-4-parallel
description: Day 4 of the agent-skills first-week onboarding — try parallel stories with git worktrees, or write a Sprint Change Proposal via the change-management runbook. Either prepares you for week-2+ scenarios.
type: guide
status: draft
version: 0.1.0
created: 2026-05-13
---

# Day 4 — Parallel work + change management

**Status:** Draft

> Today is choose-your-own: pick **branch (a)** to try parallel stories with git worktrees, or **branch (b)** to write a Sprint Change Proposal. Either prepares you for week-2+ scenarios. Day 4 is optional after Day 2 — Day 3 is recommended but not required.

## Prerequisites

- [ ] Completed [Day 2](./day-2-stories.md)
- [ ] (Recommended) Completed [Day 3](./day-3-messy-path.md)
- [ ] Clean working tree on `develop` or your epic branch

---

## `git worktree` primer

If you haven't used `git worktree` before, read this first (branch (a) depends on it):

```bash
# Add a worktree at a sibling path, pointing at an existing branch
git worktree add ../agent-skills-feat-x feature/feat-x

# Now you have two checkouts of the same repo with two branches.
# Each checkout has its own working tree — changes in one don't bleed into the other.
cd ../agent-skills-feat-x
# Run /develop-story here independently

# When the branch is merged, clean up:
git worktree remove ../agent-skills-feat-x
```

Worktrees share the same `.git` directory — so commits, fetches, and pushes are visible across all of them immediately.

---

## Branch (a) — Parallel stories (~3 hours)

> See [create-parallel-stories runbook](../create-parallel-stories.md) for the full pipeline.

**What you're building:** Two stories from the same epic running simultaneously in separate git worktrees.

**Steps:**

- [ ] Open [`docs/runbooks/create-parallel-stories.md`](../create-parallel-stories.md) and confirm your two stories have no file overlap (check the coordination matrix).
- [ ] Invoke `/create-parallel-stories <epic-path>` to generate the coordination matrix and worktree setup commands.
- [ ] Set up two worktrees — one per story branch:
  ```bash
  git worktree add ../agent-skills-story-A feature/story.{E}.{S1}.{name}
  git worktree add ../agent-skills-story-B feature/story.{E}.{S2}.{name}
  ```
- [ ] Open two terminal sessions (or agent sessions). In each, `cd` to the matching worktree and run `/develop-story <story-path>`.
- [ ] Both pipelines run independently — commits in one worktree do not affect the other.
- [ ] Confirm both PRs open against the epic branch without conflict.

**Expected artifact:** Two open PRs against `feature/epic.{E}.*`, each from its own story branch.

---

## Branch (b) — Change management (~2 hours)

> See [change-management runbook](../change-management.md) for the full pipeline.

**What you're building:** A Sprint Change Proposal documenting a plan-level pivot.

**Steps:**

- [ ] Identify a pivot worth documenting. Real pivots work best, but a simulated one is fine — for example: "Day 5 PRD scope grew unexpectedly and one story must be descoped."
- [ ] Invoke `/change-management` (or `/correct-course` directly).
- [ ] Work through the `change-checklist` 6-section structure interactively.
- [ ] Output: a Sprint Change Proposal markdown file committed to your repo.

**Tip:** `change-checklist` is invoked by `change-management` automatically. You can also invoke it standalone via `/change-checklist` if you want to walk the 6 sections without the full orchestration.

**Expected artifact:** One Sprint Change Proposal `.md` file committed (path determined by `change-management` output).

---

## End of day — Verify

Run these checks before calling Day 4 done:

- [ ] **Branch (a):** Two PRs open against the epic branch, each from its own worktree, with no merge conflicts. **OR**
- [ ] **Branch (b):** One Sprint Change Proposal `.md` file committed to the repo with all 6 sections complete.

---

## What you learned

**Branch (a):**
- `git worktrees` let multiple agent sessions share one repo without stepping on each other.
- `/create-parallel-stories` scopes file boundaries — respect the coordination matrix.
- PRs target the epic branch regardless of how many stories run in parallel.

**Branch (b):**
- Plan-level disruption is handled by `change-management`, not by improvising edits.
- The Sprint Change Proposal is the audit trail — it explains *why* things changed.
- The 6-section `change-checklist` forces you to analyse cascades before editing any artifacts.

---

## Next: [First-week index](../first-week.md)

Day 4 closes the structured first-week path. From here, week-2+ work follows the same pipeline — stories, parallel or serial, with `/develop-story` running end-to-end.

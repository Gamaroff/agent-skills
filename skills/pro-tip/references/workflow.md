# Workflow & Pipeline Tips

Tips for multi-skill pipelines, git workflow conventions, and project lifecycle patterns.

---

## WF-01 — develop-story / develop-task Runs the Full Lifecycle

The `develop-story` and `develop-task` skills automate the entire pipeline: create-branch, review, develop, create-pr, QA, fix, finalise, commit. Don't manually invoke each step when the orchestrator handles sequencing, error recovery, and register updates for you.

**Example:** `/develop-story 33.1` — not manual `/create-branch` then `/develop` then `/create-pr` in sequence.
**Why it matters:** Manual pipelines skip steps (especially register updates and QA gates), creating inconsistent project state.

---

## WF-02 — Stash Before Branch Creation

If you have uncommitted files (implementation reports, plan drafts) when `create-branch` runs, it will fail or carry artifacts into the new branch. Stash untracked files before branching, then pop after checkout.

**Example:** `git stash push --include-untracked -m "impl report"` before `/create-branch`, then `git stash pop` after.
**Why it matters:** Dirty-tree errors interrupt the pipeline and require manual recovery.

---

## WF-03 — Unstage Reports Before create-pr Commits

Implementation reports and QA artifacts should not be included in the PR's committed code. Unstage them before `create-pr` runs its commit step so they remain local working files.

**Example:** `git restore --staged docs/prds/epics/epic.33/stories/story.33.1/story.33.1.implementation.1.md`
**Why it matters:** Reports committed to the PR bloat the diff and trigger unnecessary review comments.

---

## WF-04 — Branch Naming Follows Gitflow Conventions

Branches follow a strict pattern: `feature/story.X.Y.*` for stories, `feature/task.N.*` for tasks, `hotfix/*` for production fixes. PRs always target `develop`, never `main` directly. The `create-branch` skill enforces this, but manual branch creation must follow the same rules.

**Example:** `feature/story.33.1.waitlist-mailing-group-sync` — not `waitlist-sync` or `story-33-1`.
**Why it matters:** CI filters and PR automation depend on the prefix; wrong names bypass checks silently.

---

## WF-05 — Register Updates: Icons Signal State

The story register uses status icons that must be updated at each lifecycle stage: `⚡` when work starts, `✅` when finalised, `❌` for blocked/not-started. The develop-story/develop-task pipelines handle this, but manual workflows must update the register explicitly.

**Example:** Change `❌ story 33.2` to `⚡ story 33.2` when beginning work; to `✅ story 33.2 PR #248` when merged.
**Why it matters:** Stale register status misleads team members about what's in progress and what's available to pick up.

---

## WF-06 — QA Artifacts Live with Their Story/Task

Gate files, QA reports, bug reports, and DoD files are always co-located in the story or task directory — never in a central `docs/qa/` path. This keeps all context for a piece of work discoverable in one place.

**Example:** `.plans/tasks/trusted-device-location-info/qa-gate.md` — not `docs/qa/task-14-gate.md`.
**Why it matters:** Scattered QA artifacts get orphaned when stories are archived or directories are reorganised.

---

## WF-07 — Merge Freeze Awareness

Before starting work on a new branch, check whether a merge freeze is active (release cuts, deployment windows). Starting a feature branch during a freeze wastes effort if the PR can't be merged until the window reopens.

**Example:** Check project memory or team communication before `/create-branch` during release periods.
**Why it matters:** Completed PRs that sit unmerged accumulate conflicts and require rework after the freeze lifts.

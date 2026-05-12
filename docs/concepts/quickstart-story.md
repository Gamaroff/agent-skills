---
name: quickstart-story
description: Ship your first agent-skills story in 60 minutes. End-to-end PRD → epic → story → develop-story chain with all artifacts on disk.
type: guide
status: ready-for-review
version: 0.1.0
created: 2026-05-12
---

# Quickstart: Your first story in 60 minutes

**Status:** Ready for Review

> Promise: by the end of this page you will have a real story — PRD, epic, story, review, implementation report, PR, QA report, gate file, DoD checklist, and sprint review summary — sitting in `docs/prd/` on a branch you can delete.

## Prerequisites

- Node ≥ 20 (`node --version`)
- `git` (`git --version`)
- `gh` CLI authenticated: `gh auth status` must return a logged-in account (required for PR creation)
- `project.yml` at repo root (needed for GitHub project board integration)
- A clone of this repo: `git clone git@github.com:Gamaroff/agent-skills.git && cd agent-skills`
- A working terminal where you can invoke this CLI agent

⏱ Set a 60-minute timer. If you blow through it, your walkthrough is your bug report.

---

## 1. Verify install (≤ 2 min)

```bash
npx skills add --all
gh auth status
```

Expected: skills report `installed` or `up-to-date`; `gh` reports a logged-in account. If `gh auth status` shows `not logged in`, run `gh auth login` first. Re-running `npx skills add --all` is idempotent — safe to repeat.

---

## 2. Create the PRD (≤ 5 min)

Tell the agent:

> `/create-prd` Add a footer link to `docs/runbooks/README.md` pointing at `CONTRIBUTING.md`. Single-epic brownfield enhancement. Title: "footer-link".

The skill creates:

```
docs/prd/footer-link/
└── prd.footer-link.md
```

When prompted, answer **No** to sharding (single-epic PRD needs no split).

---

## 3. Create the epic (≤ 3 min)

> `/create-epic docs/prd/footer-link/prd.footer-link.md`

The skill assigns the next epic number from `docs/epic-registry.md` and writes:

```
docs/prd/footer-link/epics/
└── epic.{N}.footer-link/
    └── epic.{N}.footer-link.md
```

When prompted for tracker, choose **Skip** (or set `SKIP_TRACKER=1`) to avoid creating a practice issue in your tracker.

---

## 4. Create the story (≤ 3 min)

> `/create-story docs/prd/footer-link/epics/epic.{N}.footer-link/epic.{N}.footer-link.md`

The skill writes the first story under the epic:

```
docs/prd/footer-link/epics/epic.{N}.footer-link/stories/
└── story.{N}.1.add-footer-link/
    ├── story.{N}.1.add-footer-link.md
    └── story.{N}.1.plan.add-footer-link.md
```

No additional prompts beyond confirming the story title.

---

## 5. Develop the story (≤ 45 min)

```text
/develop-story docs/prd/footer-link/epics/epic.{N}.footer-link/stories/story.{N}.1.add-footer-link/
```

Phase 0 of `/develop-story` will ask several questions. Recommended answers for a practice run:

| Prompt | Recommended answer |
|---|---|
| Base branch | `develop` (or `main` if your repo has no `develop` branch) |
| PR target | epic branch — `feature/epic.{N}.footer-link` |
| Create epic branch from develop? | Yes |
| Lite mode? | Yes — speeds up a trivial single-file story |

The agent then chains: **create-branch → review-story → develop → create-pr → qa-story → qa-fix → finalise → commit**. Sit back — the chain completes automatically when the QA gate is PASS and DoD is done.

If QA loops more than once it is working as intended; a one-line README change should pass first try.

> **Note:** PR creation requires a round-trip to the GitHub API (1–2 min). This latency is external and does not count toward your 60-min budget.

---

## 6. Review your artifacts (≤ 2 min)

```bash
ls docs/prd/footer-link/epics/epic.{N}.footer-link/stories/story.{N}.1.add-footer-link/
```

You should have all 10 artifact types:

| # | Artifact | What it is |
|---|---|---|
| 1 | `prd.footer-link.md` | Practice PRD |
| 2 | `epic.{N}.footer-link.md` | Parent epic |
| 3 | `story.{N}.1.add-footer-link.md` | Story spec |
| 4 | `story.{N}.1.plan.add-footer-link.md` | Co-located implementation plan |
| 5 | `story.{N}.1.review.{date}.md` | Story review report |
| 6 | `story.{N}.1.implementation.1.*.md` | What was built + pipeline log |
| 7 | PR URL | GitHub Pull Request (opened by `/develop-story`) |
| 8 | `story.{N}.1.qa.1.*.md` | QA findings + traceability matrix |
| 9 | `story.{N}.1.gate.1.*.yml` | PASS / CONCERNS / FAIL gate |
| 10 | `story.{N}.1.dod.1.*.md` | Definition-of-Done checklist + sprint review summary |

For an annotated example of what these files look like, see `examples/story-walkthrough/` (pending Epic 2).

---

## 7. Cleanup (≤ 2 min)

Pick one:

**A. Keep the artifact as proof (recommended for first-time users).**

Leave the branch as-is. Mark the epic row `CANCELLED` in `docs/epic-registry.md`. Mark the story `status: cancelled` in its frontmatter. Numbers are never recycled — the rows stay forever as records.

Close the practice PR on GitHub and close any practice GitHub issues the chain opened.

**B. Full cleanup.**

```bash
git checkout develop
git branch -D feature/epic.{N}.footer-link feature/story.{N}.1.add-footer-link
```

Revert or drop the PRD/epic/story commits from your branch. Mark registry rows `CANCELLED` — do NOT delete them.

If a practice GitHub milestone was created: delete it once all linked issues are closed.

⏱ Timer should read ≤ 60 min. If not, see "What slowed you down?" below.

---

## What slowed you down?

| Symptom | Likely cause | Fix |
|---|---|---|
| `gh auth status` not logged in | `gh` not configured | Run `gh auth login` |
| Phase 0 prompts differ from table above | Skill version drift | Check `.agents/skills/develop-story/` version |
| `/develop-story` pauses at QA planning | Expected — test plan generation | Wait 30–60 s |
| QA loop ran more than once | Practice change touched something non-trivial | Use a simpler story (one-line file change) |
| Elapsed > 60 min | GitHub API latency | API round-trips are out-of-scope; timer pauses while waiting |
| Epic registry conflict on merge | Two branches appended the same row | Resolve conflict: increment the number in your branch |
| Dual registry pollution | Pipeline bug triggered a task lane | Check `docs/tasks/task-registry.md`; mark any spurious row `CANCELLED` |

---

## See also

- `docs/standards/status-lifecycle.md` — lifecycle states (`draft → ready-for-development → in-progress → accepted`)
- `docs/standards/file-naming.md` — naming conventions for story artifacts
- `docs/runbooks/story-development.md` — deep-dive on the full story development workflow (Phase A–D)
- `examples/README.md` — annotated full-lifecycle artifact set (`task.6` worked task example)
- `examples/story-walkthrough/` — canonical worked story (pending Epic 2)
- `docs/concepts/quickstart-task.md` — 10-minute task quickstart (simpler entry point)

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-05-12 | 0.1.0 | Initial draft | dev-agent |

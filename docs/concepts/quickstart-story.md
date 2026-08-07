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

> **Haven't set up agent-skills in this project yet?** Run the [setup wizard](./getting-started.md#quick-setup-wizard) first — it installs skills, writes `skills-config.yaml`, creates the registries, and registers the pipeline hooks. The prerequisites below assume that's done.

## Prerequisites

Universal:

- Node ≥ 20 (`node --version`)
- `git` (`git --version`)
- Skills installed in your project. First-time setup runs the full wizard (skills + config + hooks + registries + docs scaffold):
  ```bash
  bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)
  ```
  Already configured? Refresh skills with `--update` (skips the wizard).
- A working terminal where you can invoke this CLI agent

Platform-specific — pick the row that matches your project. Skills auto-detect via `skills-config.yaml` + env vars + git remote (see [`shared/resources/platform-detection.md`](../../shared/resources/platform-detection.md)).

| VCS       | Tracker       | Auth / env required                                                                                      |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| GitHub    | GitHub Issues | `gh` CLI authenticated (`gh auth status`); `project.yml` at repo root for board integration              |
| GitHub    | Jira          | `gh` CLI authenticated; `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported                         |
| Bitbucket | Jira          | `BITBUCKET_USERNAME`, `BITBUCKET_API_TOKEN`, `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported |

Not sure which row to pick? See [How to pick a row](./getting-started.md#how-to-pick-a-row) in the getting-started doc.

⏱ Set a 60-minute timer. If you blow through it, your walkthrough is your bug report.

---

## 1. Verify prerequisites (≤ 1 min)

Pick the check that matches your platform:

```bash
# GitHub VCS
gh auth status

# Bitbucket VCS
[ -n "$BITBUCKET_USERNAME" ] && [ -n "${BITBUCKET_API_TOKEN:-$BITBUCKET_APP_PASSWORD}" ] && echo "bitbucket auth ok"

# Jira tracker (run in addition to VCS check above)
[ -n "$JIRA_URL" ] && [ -n "$JIRA_API_TOKEN" ] && echo "jira auth ok"
```

Expected: logged-in account / "ok" message. If `gh` shows `not logged in`, run `gh auth login`. For Bitbucket/Jira, set the env vars in your shell profile.

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

The skill assigns the next epic number from `docs/development/epic-registry.md` and writes:

```
docs/prd/footer-link/epics/
└── epic.{N}.footer-link/
    └── epic.{N}.footer-link.md
```

When prompted for tracker, choose **Skip — docs only** to avoid creating a practice issue in your tracker.

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

Phase 0 of `/develop-story` asks two questions. Recommended answers for a practice run:

| Prompt                    | Recommended answer                                         |
| ------------------------- | ---------------------------------------------------------- |
| Q1 — Feature branch base | `develop` (or `main` if your repo has no `develop` branch) |
| Q2 — PR target           | `develop` (same as Q1)                                     |

Both prompts also offer an epic integration branch (`epic/{N}.footer-link`) as a trailing, unrecommended option. Ignore it for a practice run — it exists for epics whose stories must land as one unit, and it adds a manual promotion step at the end. Lite mode is auto-detected for a story this small; it is not a prompt.

> **What is lite mode?** A shorter pipeline mode that trades QA depth for speed on low-risk stories (single-file changes, docs edits, trivial refactors). It skips the parallel QA agents and the traceability matrix step, but **still runs every Step 7 side-effect** — PR comment, tracker update, board move, DoD post — so the audit trail is unchanged. See [`develop-pipeline-lite-mode.md`](../../shared/resources/develop-pipeline-lite-mode.md) for trigger conditions and exact behaviour. Pick `No` for anything with cross-file impact, security implications, or unclear acceptance criteria.

The agent then chains: **create-branch → review-story → develop → create-pr → qa-story → qa-fix → finalise → commit**. Sit back — the chain completes automatically when the QA gate is PASS and DoD is done.

If QA loops more than once it is working as intended; a one-line README change should pass first try.

> **Note:** PR creation requires a round-trip to your VCS host (GitHub or Bitbucket, 1–2 min). Tracker issue creation (GitHub Issues or Jira) adds another 30–60 s. This latency is external and does not count toward your 60-min budget.

---

## 6. Review your artifacts (≤ 2 min)

```bash
ls docs/prd/footer-link/epics/epic.{N}.footer-link/stories/story.{N}.1.add-footer-link/
```

You should have all 10 artifact types:

| #   | Artifact                                          | What it is                                                                 |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `prd.footer-link.md`                              | Practice PRD                                                               |
| 2   | `epic.{N}.footer-link.md`                         | Parent epic                                                                |
| 3   | `story.{N}.1.add-footer-link.md`                  | Story spec                                                                 |
| 4   | `story.{N}.1.plan.add-footer-link.md`             | Co-located implementation plan                                             |
| 5   | `story.{N}.1.review.1.add-footer-link.md`         | Story review report                                                        |
| 6   | `story.{N}.1.implementation.1.add-footer-link.md` | What was built + pipeline log                                              |
| 7   | PR URL                                            | Pull Request opened by `/develop-story` (GitHub or Bitbucket per your VCS) |
| 8   | `story.{N}.1.qa.1.add-footer-link.md`             | QA findings + traceability matrix                                          |
| 9   | `story.{N}.1.gate.1.add-footer-link.yml`          | PASS / CONCERNS / FAIL gate                                                |
| 10  | `story.{N}.1.dod.1.add-footer-link.md`            | Definition-of-Done checklist + sprint review summary                       |

For annotated worked examples of the upstream artifacts, see [`examples/prd-example/`](../../examples/prd-example/) (the PRD that drove this onboarding effort) and [`examples/epic-examples/`](../../examples/epic-examples/) (its four epics). For a deliberate FAIL → PASS walkthrough, see [Day 3 — Messy Path](../runbooks/first-week/day-3-messy-path.md).

---

## 7. Cleanup (≤ 2 min)

Pick one:

**A. Keep the artifact as proof (recommended for first-time users).**

Leave the branch as-is. Mark the epic row `CANCELLED` in `docs/development/epic-registry.md`. Mark the story `status: cancelled` in its frontmatter. Numbers are never recycled — the rows stay forever as records.

> **What a registry row looks like:** epic rows have columns `Epic # | Tracker key | Domain | Folder | Title | Status | Created`. To cancel, change the `Status` cell to `CANCELLED` (or `🚫 Cancelled`) and leave the other cells untouched. Do **not** decrement the **Next Available Epic Number** counter — numbers stay used even when cancelled. Full schemas: [`../standards/epic-registry.md`](../standards/epic-registry.md), [`../standards/task-registry.md`](../standards/task-registry.md).

Close the practice PR on your VCS host (GitHub/Bitbucket) and close any practice tracker issues the chain opened (GitHub Issues or Jira).

**B. Full cleanup.**

```bash
git checkout develop
git branch -D feature/story.{N}.1.add-footer-link
```

Revert or drop the PRD/epic/story commits from your branch. Mark registry rows `CANCELLED` — do NOT delete them.

If a practice GitHub milestone or Jira sprint/version was created: delete it once all linked issues are closed.

⏱ Timer should read ≤ 60 min. If not, see "What slowed you down?" below.

---

## What slowed you down?

| Symptom                                 | Likely cause                                  | Fix                                                                                       |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `gh auth status` not logged in          | `gh` not configured                           | Run `gh auth login`                                                                       |
| Bitbucket calls return empty / 404      | `BITBUCKET_API_TOKEN` missing, expired, or created without Bitbucket scopes | Regenerate the Atlassian API token **with Bitbucket scopes ticked**; probe with `curl -s -o /dev/null -w '%{http_code}' -u "$BITBUCKET_USERNAME:$BITBUCKET_API_TOKEN" https://api.bitbucket.org/2.0/user` (expect 200) |
| Jira issue creation fails               | Wrong `JIRA_URL` or token                     | Verify `curl -u $JIRA_USER_EMAIL:$JIRA_API_TOKEN $JIRA_URL/rest/api/3/myself` returns 200 |
| Skill picked wrong platform             | Auto-detect mis-fired                         | Set explicit `tracker:` / `vcs:` in `skills-config.yaml`                                  |
| Phase 0 prompts differ from table above | Skill version drift                           | Check `.agents/skills/develop-story/` version                                             |
| `/develop-story` pauses at QA planning  | Expected — test plan generation               | Wait 30–60 s                                                                              |
| QA loop ran more than once              | Practice change touched something non-trivial | Use a simpler story (one-line file change)                                                |
| Elapsed > 60 min                        | VCS/tracker API latency                       | API round-trips are out-of-scope; timer pauses while waiting                              |
| Epic registry conflict on merge         | Two branches appended the same row            | Resolve conflict: increment the number in your branch                                     |
| Dual registry pollution                 | Pipeline bug triggered a task lane            | Check `docs/tasks/task-registry.md`; mark any spurious row `CANCELLED`                    |

---

## See also

- `docs/standards/status-lifecycle.md` — lifecycle states (`draft → ready-for-development → in-progress → accepted`)
- `docs/standards/file-naming.md` — naming conventions for story artifacts
- `docs/runbooks/story-development.md` — deep-dive on the full story development workflow (Phase A–D)
- `examples/README.md` — annotated full-lifecycle artifact set (`task.6` worked task example)
- `examples/prd-example/`, `examples/epic-examples/` — worked PRD + epic artifacts produced by dogfooding this onboarding effort
- `docs/runbooks/first-week/day-3-messy-path.md` — FAIL → PASS walkthrough (recipe-style; no canonical messy-path example artifact exists — Story 2.3 was descoped)
- `docs/concepts/quickstart-task.md` — 10-minute task quickstart (simpler entry point)

---

## Change Log

| Date       | Version | Description   | Author    |
| ---------- | ------- | ------------- | --------- |
| 2026-05-12 | 0.1.0   | Initial draft | dev-agent |

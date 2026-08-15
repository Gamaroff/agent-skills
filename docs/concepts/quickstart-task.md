---
name: quickstart-task
description: Ship your first agent-skills task in 10 minutes. End-to-end walkthrough from /create-task to a fully QA-gated artifact set on disk.
type: guide
status: ready-for-review
version: 0.1.0
created: 2026-05-12
---

# Quickstart: Your first task in 10 minutes

**Status:** Ready for Review

> Promise: by the end of this page you will have a real task — spec, plan, implementation report, QA report, gate file, DoD checklist — sitting in `docs/tasks/` on a branch you can delete.

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

Platform-specific — needed because `/develop-task` opens a PR and (optionally) a tracker issue. Skills auto-detect via `skills-config.yaml` + env vars + git remote (see [`shared/resources/platform-detection.md`](../../shared/resources/platform-detection.md)).

| VCS | Tracker | Auth / env required |
|---|---|---|
| GitHub | GitHub Issues | `gh` CLI authenticated (`gh auth status`) |
| GitHub | Jira | `gh` CLI authenticated; `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported |
| Bitbucket | Jira | `BITBUCKET_ACCESS_TOKEN` (or `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN`), `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported |

Not sure which row to pick? See [How to pick a row](./getting-started.md#how-to-pick-a-row) in the getting-started doc. To skip tracker integration entirely (PR-only), choose **Skip — docs only** at the tracker prompt.

⏱ Set a 10-minute timer. If you blow through it, your walkthrough is your bug report.

---

## 1. Verify prerequisites (≤ 30 s)

```bash
node --version
git --version

# VCS auth — pick your platform:
gh auth status                                                              # GitHub
source shared/resources/bitbucket-auth.sh && echo "ok ($BB_AUTH_SCHEME)"  # Bitbucket

# Jira (only if tracker is Jira):
[ -n "$JIRA_URL" ] && [ -n "$JIRA_API_TOKEN" ] && echo ok
```

Expected: Node ≥ 20, git present, VCS auth confirmed, Jira auth confirmed if applicable.

---

## 2. Create the task (≤ 90 s)

Tell the agent:

> `/create-task` Add a single-line footnote at the bottom of `README.md` that points readers at `CONTRIBUTING.md`. Title: "readme-contributor-footnote".

The skill assigns the next task number from `docs/tasks/task-registry.md` and writes:

```
docs/tasks/task.{N}.readme-contributor-footnote/
└── task.{N}.readme-contributor-footnote.md
```

Confirm the registry row was appended in the same commit (per `docs/standards/task-registry.md`).

---

## 3. Develop the task (≤ 7 min)

```text
/develop-task docs/tasks/task.{N}.readme-contributor-footnote/task.{N}.readme-contributor-footnote.md
```

You will be prompted by Phase 0 for:

| Prompt | Recommended answer |
|---|---|
| Base branch | `main` (default) |
| PR target | `main` |
| Epic branch | No (single-task work) |

The agent then chains: **review-task → create-branch → develop → create-pr → qa-task → qa-fix → finalise**. You don't need to drive it — sit back. The chain stops automatically when the QA gate is PASS and DoD is complete.

If QA fails, the chain loops back into `qa-fix` (max 5 iterations). For a one-line README footnote, expect zero iterations.

---

## 4. Review your artifacts (≤ 60 s)

```bash
ls docs/tasks/task.{N}.readme-contributor-footnote/
```

You should see:

| File | What it is |
|---|---|
| `task.{N}.readme-contributor-footnote.md` | Original task spec |
| `task.{N}.plan.readme-contributor-footnote.md` | Co-located implementation plan |
| `task.{N}.implementation.1.readme-contributor-footnote.md` | What was built |
| `task.{N}.qa.1.readme-contributor-footnote.md` | QA findings + traceability |
| `task.{N}.gate.1.readme-contributor-footnote.yml` | PASS/CONCERNS/FAIL gate |
| `task.{N}.dod.1.readme-contributor-footnote.md` | Definition-of-Done checklist |

The pattern reference is `examples/README.md` — same artifact shapes, walked end-to-end on `task.6` there.

---

## 5. Cleanup (≤ 30 s)

Pick one:

**A. You want to keep the artifact as proof you ran the quickstart (recommended for first-time users).**

Leave the branch as-is. Mark the registry row `CANCELLED` in `docs/tasks/task-registry.md`. Task numbers are never recycled — this row stays forever as a record. Do NOT delete the row.

> **What a registry row looks like:** one markdown table line per task — columns are `Task # | Title link | Status | Type | Priority | Date | Issue | Depends on`. To cancel, change the `Status` cell from `accepted` / `in-progress` / `draft` to `CANCELLED` and leave the other cells untouched. Do **not** decrement the **Next Available Task Number** counter — numbers stay used even when cancelled. Full schema: [`../standards/task-registry.md`](../standards/task-registry.md).

**B. You want a perfectly clean repo.**

```bash
git checkout main
git branch -D task/task.{N}.readme-contributor-footnote
```

Then revert the registry commit (or amend it out if you haven't pushed). Note: task numbers still don't recycle — if you re-run the quickstart, you'll get `{N+1}`.

⏱ Timer should read ≤ 10 min. If not, see "What slowed you down?" below.

---

## What slowed you down?

| Symptom | Likely cause | Fix |
|---|---|---|
| `setup-consumer.sh --update` failed to download | GitHub unreachable or rate-limited | Wait and retry, or pin via `SKILLS_VERSION=vX.Y.Z` |
| `gh`/Bitbucket/Jira auth failure | Token expired or env vars missing | Re-auth `gh auth login` or re-export env vars (see Prerequisites) |
| Skill picked wrong platform | Auto-detect mis-fired | Set explicit `tracker:` / `vcs:` in `skills-config.yaml` |
| Phase 0 prompts not matching table | Agent version differs | Check installed skill version in `.agents/skills/` |
| QA loop iterated more than once | Practice task touched something non-trivial | Use a simpler task (one-line doc change) |
| Elapsed > 10 min | Slow machine + large model context | The chain itself is fast; thinking time doesn't count |

---

## See also

- `docs/standards/task-registry.md` — task numbering and registry rules
- `docs/standards/status-lifecycle.md` — lifecycle states (`draft → planned → ready-for-development → in-progress → ready-for-review → accepted`)
- `docs/standards/file-naming.md` — naming conventions for task artifacts
- `docs/runbooks/task-development.md` — deep-dive on the full task development workflow
- `examples/README.md` — annotated full-lifecycle artifact set (task.6)

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-05-12 | 0.1.0 | Initial draft — walkthrough authored and verified | dev-agent |

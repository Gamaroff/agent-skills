---
name: day-1-tasks
description: Day 1 of the agent-skills first-week onboarding — three real tasks shipped end-to-end through the task pipeline.
type: guide
status: draft
version: 0.1.0
created: 2026-05-13
---

# Day 1 — Tasks

**Status:** Draft

> By the end of today you will have shipped **3 real tasks** through `/create-task` → `/develop-task` with full artifact sets under `docs/tasks/`.

## Prerequisites

- Node ≥ 20 (`node --version`)
- A working agent CLI (e.g. Claude Code with skills installed). First-time setup: `bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)`
- A clone of this repo with a clean working tree on `develop`
- Tracker access decided — this walkthrough assumes `access: full` (the default). If the agent must not hold a tracker write token, read [Restricted tracker access](../../concepts/restricted-access.md) first: the pipeline still completes, but each task ends with a committed handover checklist instead of board moves

---

## Hour 1 — Quickstart (~10 min wall time)

Follow the quickstart end-to-end. It walks you through `/create-task` → `/develop-task` on a tiny, well-bounded task. No decisions to make — just follow each checkpoint.

> 🔗 [`docs/concepts/quickstart-task.md`](../../concepts/quickstart-task.md)

**Checkpoints:**

- [ ] `quickstart-task.md` opened and prerequisites verified
- [ ] `/create-task` run; task file created in `docs/tasks/task.{N}.readme-contributor-footnote/`
- [ ] `/develop-task` run; Phase 0 prompts answered with recommended defaults
- [ ] PR created and pipeline complete
- [ ] Artifact set #1 confirmed: `docs/tasks/task.{N}.readme-contributor-footnote/` has at least a task file, implementation report, QA report, gate file, and DoD summary

⏱ If this took more than 15 minutes, your environment setup is the blocker — fix it before continuing.

---

## Hour 2 — Follow-up task #1 (~30 min)

**Task slug:** `contributing-quickstart-link`

**What you're building:** Add a one-sentence summary to `CONTRIBUTING.md` introducing `docs/concepts/quickstart-task.md`. Something like:

```markdown
New contributors: see [Quickstart: your first task](docs/concepts/quickstart-task.md) for a 10-minute end-to-end walkthrough before diving into the pipeline details below.
```

(The link is root-relative because it will live in `CONTRIBUTING.md` at the repo root.)

This task is simple and will fly through QA with zero findings. The goal is to run the pipeline a second time with full autonomy.

- [ ] `/create-task` with slug `contributing-quickstart-link` (title: "Link quickstart-task.md from CONTRIBUTING.md")
- [ ] `/develop-task` on the new task file; accept Phase 0 recommended defaults
- [ ] Pipeline completes (or you merged the PR)
- [ ] Artifact set #2 confirmed in `docs/tasks/task.{N2}.contributing-quickstart-link/`

> 💡 Notice Phase 0 this time: the recommended branch base is `develop` by default. Accept it.

---

## Hour 3–4 — Follow-up task #2 (~45 min)

**Task slug:** `readme-status-badge`

**What you're building:** Add a CI/build status badge near the top of `README.md`.

> ⚠️ **First intentional qa-fix exposure.** This task is designed to produce at least one QA finding — badge placement touches the README's first-viewport region. Expect a `CONCERNS` or `FAIL` gate on diff-size or first-viewport visibility. That is the lesson: not all pipelines run clean on the first QA pass.

- [ ] `/create-task` with slug `readme-status-badge` (title: "Add build status badge to README.md")
- [ ] `/develop-task`. When Phase 0 asks for branch base, accept `develop`
- [ ] QA gate is reviewed — note the finding(s) (first-viewport, diff-size, or similar)
- [ ] `/qa-fix` iteration run; findings addressed
- [ ] Pipeline completes after qa-fix; PR merged
- [ ] Artifact set #3 confirmed in `docs/tasks/task.{N3}.readme-status-badge/`

> 📖 If you need a reference for the qa-fix loop, see [`docs/runbooks/task-development.md`](../task-development.md) §"Phase B — QA loop".

---

## End of day — Verify

Run these checks before calling Day 1 done:

- [ ] `ls docs/tasks/` — 3 new task directories created today
- [ ] Each directory has a full artifact set (task file + implementation report + QA report + gate file + DoD summary = at least 5 files)
- [ ] `docs/tasks/task-registry.md` — 3 new rows, counter incremented

---

## What you learned

- **Task pipeline shape:** create → develop → review → PR → QA → (qa-fix) → finalise → accepted
- **Phase 0 prompts:** what they mean and why the recommended defaults exist
- **The messy path:** QA findings are normal — `qa-fix` is how you close them, not a sign of failure

---

## Next: [Day 2 — Stories](./day-2-stories.md)

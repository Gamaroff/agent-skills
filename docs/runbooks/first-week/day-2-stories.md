---
name: day-2-stories
description: Day 2 of the agent-skills first-week onboarding — at least 1 real story shipped through the full PRD → epic → story → develop-story chain.
type: guide
status: draft
version: 0.1.0
created: 2026-05-13
---

# Day 2 — Stories

**Status:** Draft

> By the end of today you will have shipped **at least 1 real story** through the full PRD → epic → story → develop-story chain, with a PR on GitHub.

## Prerequisites

- [ ] Completed [Day 1](./day-1-tasks.md) (or already comfortable with the task pipeline)
- [ ] `gh auth status` returns logged-in — story PRs require an authenticated GitHub session
- [ ] `project.yml` exists at repo root
- [ ] Working repo branch is `develop` (or `main` if no `develop`)

---

## Hour 1 — Quickstart (~60 min)

Walk the story quickstart end-to-end. It runs you through `/create-prd` → `/create-epic` → `/create-story` → `/develop-story` on a single small, well-bounded story. Follow each checkpoint — no freeform decisions required.

> 🔗 [`docs/concepts/quickstart-story.md`](../../concepts/quickstart-story.md)

**Checkpoints:**

- [ ] `quickstart-story.md` opened and prerequisites verified
- [ ] `/create-prd` run; PRD file created
- [ ] `/create-epic` run; epic file created
- [ ] `/create-story` run; story file created with GitHub issue linked
- [ ] `/develop-story` run; Phase 0 prompts answered with recommended defaults
- [ ] PR open on GitHub; pipeline complete (QA PASS + finalised)
- [ ] Artifact set confirmed: story directory has task file, implementation report, review report, QA report, gate file, and DoD summary (≥ 6 files)

⏱ If Hour 1 exceeds 90 minutes, the bottleneck is usually GitHub API latency during PR creation — this is expected. Continue to Hour 2–3 when the PR is open, even if the pipeline has not yet finalised.

---

## Hour 2–3 — Follow-up story (~90 min)

Pick **one** follow-up story in your working repo. Selection criteria:

- Small, well-bounded — finishable in ~90 min including a QA cycle.
- Docs-only or single-file code change preferred (avoids needing design review).
- Net-new content, not a refactor — easier to scope and QA.
- Example shapes: a new concept doc, a new "See also" section, a short README addition, a single new fixture or helper.

> 💡 If nothing obvious comes to mind, browse open issues in your repo — small documentation gaps make perfect follow-up stories.

**Pipeline steps:**

- [ ] `/create-prd` (brownfield, single epic, single story)
- [ ] `/create-epic` (1 epic)
- [ ] `/create-story` (1 story)
- [ ] `/develop-story` — full chain (Phase 0 recommended defaults are safe)
- [ ] Confirm second story PR is open on GitHub

> ⚠️ **PR naming matters.** The story branch is named `feature/story.{epic}.{story}.{name}` — do not rename it manually or the pipeline will lose tracking.

---

## End of day — Verify

Run these checks before calling Day 2 done:

- [ ] ≥ 1 story PR exists on GitHub (check with `gh pr list`)
- [ ] `docs/epic-registry.md` has new epic row(s) for today's work
- [ ] Each story artifact directory has a full artifact set (≥ 6 files)
- [ ] `gh auth status` still returns logged-in (confirm session did not expire mid-day)

---

## What you learned

- **Story pipeline shape:** PRD → epic → story → branch → review → develop → PR → QA → (qa-fix) → finalise → accepted
- **The full Phase 0 prompt set for `/develop-story`:** what each question means and why the recommended defaults are safe
- **How epic-registry numbering coordinates with story creation** and why numbers are never reused

---

## Next: [Day 3 — Messy path](./day-3-messy-path.md)

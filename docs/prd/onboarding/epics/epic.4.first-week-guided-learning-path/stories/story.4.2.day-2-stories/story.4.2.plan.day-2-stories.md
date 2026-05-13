---
id: story.4.2.plan
title: "Implementation Plan: Day 2 — Stories"
type: plan
story-ref: story.4.2.day-2-stories.md
---

# Implementation Plan: Day 2 — Stories

> Requirements: [story.4.2.day-2-stories.md](story.4.2.day-2-stories.md)

## Overview

New file at `docs/runbooks/first-week/day-2-stories.md`. Same pattern as Day 1, but for the story pipeline.

## Doc skeleton

```markdown
# Day 2 — Stories

**Status:** Draft

> By the end of today you will have shipped **at least 1 real story** through the full PRD → epic → story → develop-story chain, with a PR on GitHub.

## Prerequisites

- [ ] Completed [Day 1](./day-1-tasks.md) (or already comfortable with the task pipeline)
- [ ] `gh auth status` returns logged-in
- [ ] `project.yml` exists at repo root
- [ ] Working repo branch is `develop` (or `main` if no `develop`)

## Hour 1 — Quickstart (~60 min)

- [ ] Walk [`docs/concepts/quickstart-story.md`](../../concepts/quickstart-story.md) end-to-end.
- [ ] Confirm your first story PR is open (or merged).

## Hour 2–3 — Follow-up story (~90 min)

Pick **one** follow-up story in your working repo. Selection criteria:

- Small, well-bounded — finishable in ~90 min including QA cycle.
- Docs-only or single-file code change preferred (avoids needing design review).
- Net-new content, not a refactor — easier to scope.
- Example shapes: a new "See also" section, a new short concept doc, a small README cross-link, a single new fixture.

- [ ] `/create-prd` (brownfield, single epic, single story scope).
- [ ] `/create-epic` (1 epic).
- [ ] `/create-story` (1 story).
- [ ] `/develop-story` — full chain.
- [ ] Confirm second story PR.

## End of day — Verify

- [ ] ≥ 1 story PR exists on GitHub for your work.
- [ ] `docs/epic-registry.md` has the new epic row.
- [ ] Story artifact dir has all 6 + finalise artifacts.

## What you learned

- Story pipeline shape: PRD → epic → story → branch → review → develop → PR → QA → fix → finalise.
- The full Phase 0 prompt set for `/develop-story`.
- How epic-registry numbering coordinates with PR opening.

## Next: [Day 3 — Messy path](./day-3-messy-path.md)
```

≈ 50 lines. Well under 300.

## Task-by-Task Implementation Guide

Per skeleton. Walkthrough verification on macOS.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `quickstart-story.md` not yet landed | Medium | Medium | Sequence 4.2 after 1.2 |
| Day 2 exceeds 4-hour budget due to GH latency | High | Medium | Acknowledge latency in prereqs as out-of-control |
| Follow-up story PR clashes with another user's PR | Low | Low | Use a distinct slug per user |

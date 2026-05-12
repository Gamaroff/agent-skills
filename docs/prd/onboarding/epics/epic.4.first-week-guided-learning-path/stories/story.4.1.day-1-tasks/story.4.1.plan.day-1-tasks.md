---
id: story.4.1.plan
title: "Implementation Plan: Day 1 — Tasks"
type: plan
story-ref: story.4.1.day-1-tasks.md
---

# Implementation Plan: Day 1 — Tasks

> Requirements: [story.4.1.day-1-tasks.md](story.4.1.day-1-tasks.md)

## Overview

New file at `docs/runbooks/first-week/day-1-tasks.md`. Checkpoint-style walkthrough spanning 1 quickstart + 2 follow-up tasks.

## Doc skeleton

```yaml
---
name: day-1-tasks
description: Day 1 of the agent-skills first-week onboarding — three real tasks shipped end-to-end through the task pipeline.
type: guide
status: draft
version: 0.1.0
created: 2026-05-XX
---
```

```markdown
# Day 1 — Tasks

**Status:** Draft

> By the end of today you will have shipped **3 real tasks** through `/create-task` + `/develop-task` with full artifact sets under `docs/tasks/`.

## Hour 1 — Quickstart (~10 min wall time)

- [ ] Walk [`docs/concepts/quickstart-task.md`](../../concepts/quickstart-task.md) end-to-end.
- [ ] Confirm artifact set #1 exists under `docs/tasks/task.{N1}.{slug}/`.

## Hour 2 — Follow-up task #1 (~30 min)

**Task:** "Add a one-sentence summary to `CONTRIBUTING.md` introducing the new `quickstart-task.md`."

- [ ] `/create-task` for the above. Use slug `contributing-quickstart-link`.
- [ ] `/develop-task` on it. Use the recommended Phase 0 defaults from quickstart-task.md.
- [ ] Confirm artifact set #2 exists under `docs/tasks/task.{N2}.{slug}/`.

## Hour 3–4 — Follow-up task #2 (~45 min)

**Task:** "Add a build/test status badge near the top of README.md."

This one is slightly more complex — touches the README's first-viewport region, so the developer must avoid pushing the existing badges/install section below the fold.

- [ ] `/create-task` with slug `readme-status-badge`.
- [ ] `/develop-task`. Expect a QA-gate finding about diff size or first-viewport visibility — that's the lesson.
- [ ] If QA fails, walk the qa-fix iteration. This is your first taste of the messy path.
- [ ] Confirm artifact set #3.

## End of day — Verify

- [ ] `ls docs/tasks/` shows 3 new task directories.
- [ ] Each has a full artifact set (6 files minimum).
- [ ] `docs/tasks/task-registry.md` has 3 new rows.

## What you learned

- Task pipeline shape: create → develop → review → PR → QA → fix → finalise.
- Phase 0 prompts and recommended defaults.
- One messy-path iteration in a low-stakes setting.

## Next: [Day 2 — Stories](./day-2-stories.md)
```

≈ 60 lines body. Well under 300 cap.

## Task-by-Task Implementation Guide

### Task 1 — Create dir + skeleton

```bash
mkdir -p docs/runbooks/first-week
# Write file via Write tool
```

### Tasks 2–5 — Author sections

Per skeleton above. Time budgets per section explicit.

### Task 6 — Walkthrough verification

Clean clone, walk Day 1 top-to-bottom, stopwatch each section. Record in implementation report. Linux walk deferred (parent NFR3, dispatched in Epic 1 Story 1.5).

### Task 7 — Validation + status

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Quickstart-task.md not yet landed when 4.1 develops | Medium | Medium | Sequence 4.1 after 1.1 |
| Follow-up task #2 (badge) QA-fails unexpectedly | Medium | Low | Treated as a feature — first messy-path exposure |
| Day exceeds 4-hour budget | Medium | Medium | Per-section budgets; if blown, simplify follow-ups |

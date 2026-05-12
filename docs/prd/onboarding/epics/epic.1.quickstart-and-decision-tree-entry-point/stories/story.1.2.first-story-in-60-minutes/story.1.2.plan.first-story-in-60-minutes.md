---
id: story.1.2.plan
title: "Implementation Plan: First story in 60 minutes quickstart"
type: plan
story-ref: story.1.2.first-story-in-60-minutes.md
---

# Implementation Plan: First story in 60 minutes quickstart

> Requirements: [story.1.2.first-story-in-60-minutes.md](story.1.2.first-story-in-60-minutes.md)

## Overview

Mirror Story 1.1's structure but for the story pipeline. Stricter budget (60 min vs 10 min) requires aggressive trimming of optional pipeline stages in the example.

## Example PRD to use (consistent across the doc)

**Title:** "Add a footer link to `docs/runbooks/README.md` pointing at the contributing guide."
- 1 epic, 1 story, 1-line PR.
- Develop-story chain runs in ≈ 30 min on average machine.
- 30 min headroom for create-prd + create-epic + create-story.

## Task-by-Task Implementation Guide

### Task 1 — Skeleton + frontmatter

```yaml
---
name: quickstart-story
description: Ship your first agent-skills story in 60 minutes. End-to-end PRD → epic → story → develop-story chain with all artifacts on disk.
type: guide
status: draft
version: 0.1.0
created: 2026-05-11
---
```

### Task 2 — Prerequisites

```markdown
## Prerequisites
- Node ≥ 20
- `gh auth status` returns logged-in
- `project.yml` exists at repo root (needed for `/create-epic` GitHub path)
- A clean clone in a temp dir
- ⏱  60-min timer
```

### Task 3 — `/create-prd`

Use brownfield mode, tiny scope. Pre-warn:
- Path question (default `docs/prd/<feature>/prd.<feature>.md`)
- Epic-registry bootstrap (if missing)
- Sharding question (default No for 1-epic PRD)

### Task 4 — `/create-epic`

Pre-warn:
- Tracker prompt (recommend `SKIP_TRACKER=1` for the practice run to avoid polluting issue tracker)
- Domain/feature prompts

### Task 5 — `/create-story`

Auto-derives next story (1.1). No prompts expected.

### Task 6 — `/develop-story`

Pre-warn ALL Phase 0 prompts in a single table:

| Prompt | Recommended for practice run |
|---|---|
| Base branch | `develop` (or `main` if no `develop` branch) |
| PR target | epic branch |
| Create epic branch from develop? | Yes |
| Lite mode? | Yes — speeds up trivial story |

### Task 7 — Artifact review

Expected paths (10 artifact types):
- PRD: `docs/prd/<feature>/prd.<feature>.md`
- Epic-registry row + epic doc + tracker line
- Story doc + co-located plan
- Story review report
- Implementation report
- PR URL (GitHub)
- QA report
- Gate file
- DoD checklist
- Sprint review summary

### Task 8 — Cleanup

Dual path. Practice run with `SKIP_TRACKER=1` minimises external state. Local-only cleanup:

```bash
git checkout main
git branch -D feature/epic.{N}.<slug> feature/epic.{N}.story.{N}.1.<slug>
# Mark epic-registry + task-registry rows CANCELLED (do not delete — numbers never recycle)
```

If tracker was NOT skipped: close practice issues; delete practice milestone.

### Task 9 — Cross-links

```markdown
For more depth: see [examples/](../../examples/) — task.6 is the canonical worked task; (pending Epic 2) the canonical worked story will land at `examples/story-walkthrough/`.
```

Use the `(pending Epic 2)` marker for links that don't yet resolve; markdown link check will pass because the linked dirs exist.

### Task 10 — Walkthrough verification

Stopwatched walk. Record elapsed in implementation report. Tighten if > 60 min.

Slowest expected section: `/develop-story` (≈ 30–45 min depending on PR review wait). If push to GitHub PR-review delay dominates, mark that latency as "expected — not in the doc's control" rather than padding the doc.

### Task 11 — Static validation + status flip

Same pattern as Story 1.1 Task 8.

## Key Patterns and References

- [`docs/concepts/quickstart-task.md`](../../../../../concepts/quickstart-task.md) (Story 1.1 output) — section structure to mirror.
- [`docs/runbooks/story-development.md`](../../../../../runbooks/story-development.md) — link out for depth; do NOT duplicate.
- [`docs/standards/document-status-lifecycle.md`](../../../../../standards/document-status-lifecycle.md) — frontmatter + body status pairing.
- Commits `df0b690`, `ce297a6` — pipeline regression history; quickstart treats chain as black box.

## Testing Approach

- Static: `documentation-standards-validator`.
- Walkthrough: 60-min stopwatched, macOS minimum.
- Link check: `.github/workflows/` markdown link check workflow (commit `f6810df`).
- Linux walk deferred to Story 1.5 per parent NFR3.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 60-min budget broken by external GH latency | High | Medium | Note latency as out-of-scope; do not pad doc |
| User pushes practice issues/milestones to public board | Medium | Low | Recommend `SKIP_TRACKER=1` in prerequisites |
| Practice run pollutes epic-registry/task-registry | Medium | Low | Cleanup section documents CANCELLED-row pattern |
| AskUserQuestion drift between pipeline versions | Medium | Medium | Pre-warn table in Task 6; flag version where doc was verified |

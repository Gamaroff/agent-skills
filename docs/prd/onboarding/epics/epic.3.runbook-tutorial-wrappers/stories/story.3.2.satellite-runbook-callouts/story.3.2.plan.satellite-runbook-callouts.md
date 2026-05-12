---
id: story.3.2.plan
title: "Implementation Plan: Satellite runbook callouts"
type: plan
story-ref: story.3.2.satellite-runbook-callouts.md
---

# Implementation Plan: Satellite runbook callouts

> Requirements: [story.3.2.satellite-runbook-callouts.md](story.3.2.satellite-runbook-callouts.md)

## Overview

Four surgical inserts. Common template, runbook-specific "use this if / use that instead" content.

## Per-runbook callout content

### hotfix.md

```markdown
> ### Is this the right runbook?
>
> **Use this if** something is broken in production *right now* and a normal story-cycle is too slow.
>
> **Use a different runbook if:**
> - The work is internal (refactor, infra) → [`task-development.md`](./task-development.md)
> - The work is a user-facing feature/bug that is NOT live-broken → [`story-development.md`](./story-development.md)
> - You're not sure → [decision tree](../concepts/which-path.md)
```

### bug-fix.md

```markdown
> ### Is this the right runbook?
>
> **Use this if** you're tracking down a bug in your local development cycle (not a live production incident).
>
> **Use a different runbook if:**
> - The bug is in production right now → [`hotfix.md`](./hotfix.md)
> - The bug fix needs PRD/epic-level planning (architectural change) → [`story-development.md`](./story-development.md)
> - You're not sure → [decision tree](../concepts/which-path.md)
```

### create-parallel-stories.md

```markdown
> ### Is this the right runbook?
>
> **Use this if** you have 2+ developers (or 2+ agent sessions) shipping interdependent stories simultaneously.
>
> **Use a different runbook if:**
> - You're alone, shipping one story end-to-end → [`story-development.md`](./story-development.md)
> - The work is internal and not user-facing → [`task-development.md`](./task-development.md)
> - You're not sure → [decision tree](../concepts/which-path.md)
```

### change-management.md

```markdown
> ### Is this the right runbook?
>
> **Use this if** mid-pipeline conditions changed and the current PRD/epic/story plan no longer fits — pivots, missing reqs, blocked stories.
>
> **Use a different runbook if:**
> - You're starting fresh, not changing course → [`story-development.md`](./story-development.md)
> - The change is a routine bug → [`bug-fix.md`](./bug-fix.md)
> - You're not sure → [decision tree](../concepts/which-path.md)
```

Each ≈ 9 lines including blockquote prefix.

## Task-by-Task Implementation Guide

### Task 1 — Snapshot

```bash
for f in hotfix bug-fix create-parallel-stories change-management; do
  cp docs/runbooks/$f.md /tmp/$f-before.md
done
```

### Task 3 — Insert

Edit tool, per file. `old_string` = title line + first content line (for uniqueness). `new_string` = title + blank + callout + `---` separator + first content line.

### Task 4 — Diff verify × 4

```bash
for f in hotfix bug-fix create-parallel-stories change-management; do
  # Compare lines below the inserted block to the snapshot
  diff <(sed -n '/^---$/,$p' docs/runbooks/$f.md) /tmp/$f-before.md
done
```

### Task 5 — Validation + status

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing intro displaced | Medium | Medium | Per-file diff verify (Task 4) |
| Callout wording wrong for runbook context | Low | Low | Per-runbook template above is content-specific |
| which-path.md not yet merged | Medium | Low | Link tolerated; resolves when Story 1.3 lands |

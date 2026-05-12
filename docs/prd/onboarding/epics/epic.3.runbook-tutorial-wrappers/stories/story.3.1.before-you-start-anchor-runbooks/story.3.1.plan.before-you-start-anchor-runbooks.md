---
id: story.3.1.plan
title: "Implementation Plan: Before-you-start for anchor runbooks"
type: plan
story-ref: story.3.1.before-you-start-anchor-runbooks.md
---

# Implementation Plan: Before-you-start for anchor runbooks

> Requirements: [story.3.1.before-you-start-anchor-runbooks.md](story.3.1.before-you-start-anchor-runbooks.md)

## Overview

Two surgical inserts. Same template, parameterised per runbook.

## Template (parameterise per runbook)

```markdown
## Before you start

> This is the **anchor reference** for {pipeline} work. Skim it cold and you'll bounce off — it assumes you already know the shape of the {pipeline} chain.

**If you haven't shipped a {pipeline} artifact before:** stop and follow [`{quickstart}`](../concepts/{quickstart}.md) first. It produces a real artifact in {time-budget}.

**Skim these standards first (5 min total):**

- [`file-naming.md`](../standards/file-naming.md) — DOTS, kebab-case, dots-as-separators
- [`document-status-lifecycle.md`](../standards/document-status-lifecycle.md) — frontmatter status pairing
- [`{registry}.md`](../standards/{registry}.md) — globally-unique numbering

**Use a different runbook instead if:**

- The work is **internal** (refactor, infra, cleanup) → see [`task-development.md`](./task-development.md)
- The work is **broken in production** → see [`hotfix.md`](./hotfix.md)
- The work is part of a **coordinated multi-stream effort** → see [`create-parallel-stories.md`](./create-parallel-stories.md)
- You're not sure → see the [decision tree](../concepts/which-path.md)

---
```

Parameter table:

| Runbook | `{pipeline}` | `{quickstart}` | `{time-budget}` | `{registry}` |
|---|---|---|---|---|
| story-development.md | story | quickstart-story | 60 minutes | epic-registry |
| task-development.md | task | quickstart-task | 10 minutes | task-registry |
| (and adjust the "different runbook" list to omit self-reference) |

Each instance ≈ 20–25 lines. Well under 30.

## Task-by-Task Implementation Guide

### Task 1 — Snapshot

```bash
cp docs/runbooks/story-development.md /tmp/story-dev-before.md
cp docs/runbooks/task-development.md /tmp/task-dev-before.md
```

### Tasks 2–4 — Insert

Use Edit tool with precise `old_string` matching the title line + first heading line of each runbook (for uniqueness), `new_string` = same + template instance + `---` separator.

### Task 5 — Diff verify

```bash
# Extract the part BELOW the inserted section in the new file
sed -n '/^---$/,$p' docs/runbooks/story-development.md > /tmp/story-dev-after-body.md
# Compare to snapshot's body (everything below the first heading)
diff /tmp/story-dev-before.md /tmp/story-dev-after-body.md
```

Expected: empty (modulo the `---` separator line if not present originally).

### Task 6 — Validation

Static validator + link check.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Edit displaces existing intro paragraph | Medium | Medium | Task 5 diff verification gate |
| Self-reference link in "use different runbook" | Low | Low | Per-runbook parameter table removes self |
| Standards docs renamed | Low | Low | Link check catches |

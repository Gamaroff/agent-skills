---
id: story.1.1.plan
title: "Implementation Plan: First task in 10 minutes quickstart"
type: plan
story-ref: story.1.1.first-task-in-10-minutes.md
---

# Implementation Plan: First task in 10 minutes quickstart

> Requirements and acceptance criteria: [story.1.1.first-task-in-10-minutes.md](story.1.1.first-task-in-10-minutes.md)

## Overview

Single net-new doc at `docs/concepts/quickstart-task.md`. Section-by-section authoring against a strict 400-line cap and a 10-minute wall-time budget. Verification is a literal stopwatched walkthrough on a clean clone.

## Task-by-Task Implementation Guide

### Task 1 — File skeleton + frontmatter

**File to create:** `docs/concepts/quickstart-task.md`

**Frontmatter block (exact):**

```yaml
---
name: quickstart-task
description: Ship your first agent-skills task in 10 minutes. End-to-end walkthrough from /create-task to a fully QA-gated artifact set on disk.
type: guide
status: draft
version: 0.1.0
created: 2026-05-11
---
```

**Top of body (after frontmatter):**

```markdown
# Quickstart: Your first task in 10 minutes

**Status:** Draft

> Promise: by the end of this page you will have a real task — spec, plan, implementation report, QA report, gate file, DoD checklist — sitting in `docs/tasks/` on a branch you can delete.

## Prerequisites

- Node ≥ 20 (`node --version`)
- `git` (`git --version`)
- A clone of this repo: `git clone git@github.com:Gamaroff/agent-skills.git && cd agent-skills`
- A working terminal where you can invoke this CLI agent

⏱  Set a 10-minute timer. If you blow through it, your walkthrough is your bug report.
```

### Task 2 — "Install verification" section

**Pattern:** one command, expected output snippet, idempotency note. Don't pad.

```markdown
## 1. Verify install (≤ 30 s)

```bash
npx skills add --all
```

Expected: a short list of skill names with `installed` or `up-to-date` next to each. Re-running is safe — the installer is idempotent (commit `e81c8be`). If you see `command not found: npx`, install Node ≥ 20 first.
```

### Task 3 — "/create-task" section

**Pick the practice task once and use the same task across every walkthrough.** Recommended: "Add a footnote at the bottom of `README.md` pointing at the contributor guide." It is small, isolated, doesn't risk merge conflicts, and exercises the full chain.

```markdown
## 2. Create the task (≤ 90 s)

Tell the agent:

> `/create-task` Add a single-line footnote at the bottom of `README.md` that points readers at `CONTRIBUTING.md`. Title: "readme-contributor-footnote".

The skill will assign the next task number from `docs/tasks/task-registry.md` and write:

```
docs/tasks/task.{N}.readme-contributor-footnote/
└── task.{N}.readme-contributor-footnote.md
```

Confirm the registry row was appended in the same commit (per `docs/standards/task-registry.md`).
```

### Task 4 — "/develop-task" section

**Critical:** `/develop-task` chains many sub-skills and emits AskUserQuestion prompts at Phase 0 (base branch, PR target, optionally epic branch). The quickstart MUST pre-warn the user and give defaults.

```markdown
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

The agent then chains: **review-task → create-branch → develop → create-pr → qa-task → qa-fix → finalise**. You don't need to drive it — sit back. The chain stops automatically when QA gate is PASS and DoD is complete.

If QA fails, the chain loops back into `qa-fix` (max 5 iterations). For a one-line README footnote, expect zero iterations.
```

### Task 5 — "Review your artifacts" section

```markdown
## 4. Review your artifacts (≤ 60 s)

```bash
ls docs/tasks/task.{N}.readme-contributor-footnote/
```

You should see:

| File | What it is |
|---|---|
| `task.{N}.readme-contributor-footnote.md` | Original task spec |
| `task.{N}.plan.readme-contributor-footnote.md` | Co-located implementation plan |
| `task.{N}.implementation.1.readme-contributor-footnote*.md` | What was built |
| `task.{N}.qa.1.readme-contributor-footnote.md` | QA findings + traceability |
| `task.{N}.gate.1.readme-contributor-footnote.yml` | PASS/CONCERNS/FAIL gate |
| `task.{N}.dod.1.readme-contributor-footnote.md` | Definition-of-Done checklist |

The pattern reference is `examples/README.md` — same artifact shapes, walked end-to-end on task.6 there.
```

### Task 6 — "Cleanup" section

**Anti-pattern:** `git push` then walk away — registry now has a permanent row for a throwaway task, and the actual README footnote is in `main`. Document both clean exits.

```markdown
## 5. Cleanup (≤ 30 s)

Pick one:

**A. You want to keep the artifact as proof you ran the quickstart (recommended for first-time users).**

Leave the branch as-is. Mark the registry row `CANCELLED` in `docs/tasks/task-registry.md`. Task numbers are never recycled — this row stays forever as a record. Do NOT delete the row.

**B. You want a perfectly clean repo.**

```bash
git checkout main
git branch -D task/task.{N}.readme-contributor-footnote
```

Then revert the registry commit (or amend it out if you haven't pushed). Note: task numbers still don't recycle — if you re-run the quickstart, you'll get `{N+1}`.

⏱  Timer should read ≤ 10 min. If not, see "What slowed you down?" below.
```

### Task 7 — Walk-through verification

Walk on a clean clone in `/tmp/`. Record elapsed time. If > 10 min, identify the slowest section and tighten. Record macOS pass; defer Linux to Story 1.5.

**Implementation report deliverable:**
- Elapsed wall time (target ≤ 600 s)
- Slowest section (if any > 90 s outside the develop-task chain)
- Any AskUserQuestion prompts the doc did not pre-warn about
- macOS version walked on

### Task 8 — Static validation + status flip

```bash
wc -l docs/concepts/quickstart-task.md   # expect ≤ 400
```

Invoke `documentation-standards-validator` against the file. Fix any failures.

Flip status:

```yaml
status: ready-for-review
```

```markdown
**Status:** Ready for Review
```

Add Change Log entry:

```markdown
| 2026-05-XX | 0.2.0 | Walk-through verified on macOS; status → ready-for-review | dev-agent |
```

## Key Patterns and References

- **Status lifecycle:** [`docs/standards/document-status-lifecycle.md`](../../../../../standards/document-status-lifecycle.md). Frontmatter `status:` is `lowercase-kebab-case`; body `**Status:**` is Title Case. Always update both in the same edit.
- **File naming:** [`docs/standards/file-naming.md`](../../../../../standards/file-naming.md). Single-word slug (`quickstart-task`) is acceptable; dots reserved for structural separators (none needed at this depth).
- **Task registry rules:** [`docs/standards/task-registry.md`](../../../../../standards/task-registry.md). Numbers are globally unique and never recycled — the cleanup section MUST honour this.
- **Example anchor task:** `examples/README.md` features `task.6.create-epic-jira-tracker-path` as the canonical full-lifecycle artifact set. The quickstart's "Review your artifacts" section can mirror that table's structure.
- **CI hook:** Commit `f6810df` added a markdown link check workflow for `docs/`. Make sure all internal links in the new doc resolve before opening the PR.

## Testing Approach

- **Static (gated):** `documentation-standards-validator`. Pass before status moves to `ready-for-review`.
- **Walk-through (gated):** Task 7, on macOS minimum. The walkthrough IS the integration test for this story.
- **No unit tests** — this is a documentation story. Per parent NFR3, Linux walkthrough is deferred to the closing story of Epic 1 (Story 1.5).
- **Regression check:** After the practice task is run, confirm `docs/tasks/task-registry.md` row exists for the practice task; confirm `examples/README.md` and other doc landmarks still reachable via the markdown link check workflow (`.github/workflows/`).

## Risk register (story-local)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Walk-through exceeds 10 min on average machine | Medium | High (kills the value prop) | Time-budget per section is enforced in headings; develop-task chain owns the bulk; if budget breaks, choose a simpler practice task |
| AskUserQuestion prompt the doc didn't pre-warn about | Medium | Medium | Task 4 pre-warns Phase 0 prompts; walk-through must surface any unprompted question and the doc gets updated |
| User pushes throwaway commit to `main` | Low | Medium | Cleanup section gives two explicit clean exits; recommended path is "keep artifact, cancel registry row" — no destructive push needed |
| Registry pollution if cleanup ignored | Medium | Low | Per `docs/standards/task-registry.md`, `CANCELLED` rows are acceptable and even encouraged as records |

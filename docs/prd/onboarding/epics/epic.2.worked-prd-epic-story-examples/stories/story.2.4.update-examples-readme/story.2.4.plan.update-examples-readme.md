---
id: story.2.4.plan
title: "Implementation Plan: Update examples/README.md"
type: plan
story-ref: story.2.4.update-examples-readme.md
---

# Implementation Plan: Update examples/README.md

> Requirements: [story.2.4.update-examples-readme.md](story.2.4.update-examples-readme.md)

## Overview

Surgical edits to `examples/README.md`: remove caveat, add 3 new sections, extend lookup table, add story walkthrough entry.

## Task-by-Task Implementation Guide

### Task 2 — Remove caveat

Locate the blockquote starting with "No story, epic, or PRD examples live here" and replace with:

```markdown
> Both the **task** pipeline and the **story** pipeline have been dogfooded against this repo.
> Task artifacts live in [`docs/tasks/`](../docs/tasks/); PRD/epic/story artifacts live in
> [`examples/prd-example/`](./prd-example/), [`examples/epic-examples/`](./epic-examples/),
> and [`examples/story-messy-path/`](./story-messy-path/).
```

### Task 3 — Add new sections

Insert after the existing "Look up by skill" section:

```markdown
## Worked PRD example

[`examples/prd-example/`](./prd-example/) — a real PRD produced by `/create-prd` brownfield mode against this repo. See its [narrative README](./prd-example/README.md) for what was easy, what required iteration, and what `pm-checklist` flagged.

## Worked epic examples

[`examples/epic-examples/`](./epic-examples/) — four real epic docs from the same PRD, sibling-by-sibling, for cross-pattern comparison.

## Worked story walkthrough — the messy path

[`examples/story-messy-path/`](./story-messy-path/) — a real story that failed `qa-gate` on iteration 1 and passed on iteration 2. Shows the full FAIL → fix → PASS arc rather than just the happy path.
```

If Story 2.3 descoped, replace the messy-path section with:

```markdown
## Worked story walkthrough

[`examples/story-messy-path/`](./story-messy-path/) — _pending: no genuine `qa-gate` FAIL occurred during the PRD's pipeline run. Will be captured during a future PRD's dogfood._
```

### Task 4 — Extend lookup table

Find the existing skill→artifact lookup table and append:

```markdown
- **`create-prd`** → [PRD example](./prd-example/prd.onboarding.md)
- **`create-epic`** → [Epic examples (×4)](./epic-examples/)
- **`create-story`** → [Story messy-path original](./story-messy-path/) (or canonical at `docs/prd/onboarding/epics/.../stories/`)
- **`develop-story`** → [Story messy-path full lifecycle](./story-messy-path/)
```

### Task 5 — Story walkthrough alongside task.6

In the "Start here: one task end-to-end" section, add a parallel sub-block:

```markdown
## Or: one story end-to-end

For the story pipeline, walk `examples/story-messy-path/` in order:
1. Original story doc
2. FAIL gate (iteration 1)
3. Revision artifact
4. PASS gate (iteration 2)

This is the full messy path. The canonical happy-path story lives at `docs/prd/onboarding/epics/.../stories/`.
```

### Task 6 — Descoped-2.3 handling

If 2.3 descoped, this section says "pending" and links to the canonical story instead.

### Task 7 — Verification

```bash
grep -i "no story" examples/README.md   # expect: empty
grep -E "create-prd|create-epic|create-story|develop-story" examples/README.md   # expect: ≥ 4 matches
git diff examples/README.md   # inspect for surgical correctness
```

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Story 2.3 descoped — section text wrong | Medium | Low | Task 6 explicit branch |
| Existing task content edited inadvertently | Low | High | Diff inspection |
| Lookup table format drift | Low | Low | Match existing rows verbatim |

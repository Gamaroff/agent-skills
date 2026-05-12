---
id: story.2.2.plan
title: "Implementation Plan: Capture epics as worked examples"
type: plan
story-ref: story.2.2.capture-epics-as-worked-examples.md
---

# Implementation Plan: Capture epics as worked examples

> Requirements: [story.2.2.capture-epics-as-worked-examples.md](story.2.2.capture-epics-as-worked-examples.md)

## Overview

Bulk-copy 4 epic docs into `examples/epic-examples/` with provenance frontmatter. Single index README.

## Task-by-Task Implementation Guide

### Task 1–2 — Create + copy (loop)

```bash
mkdir -p examples/epic-examples
SHA=$(git rev-parse HEAD)
for N in 1 2 3 4; do
  SRC=$(ls docs/prd/onboarding/epics/epic.${N}.*/epic.${N}.*.md)
  DST=examples/epic-examples/$(basename "$SRC")
  cp "$SRC" "$DST"
done
```

### Task 3 — Provenance frontmatter

Reuse Story 2.1's script/approach. For each captured file, append/merge into existing frontmatter:

```yaml
captured_skill_version: "create-epic v?.?.?"
captured_date: 2026-05-XX
source_sha: <SHA from above>
source_path: docs/prd/onboarding/epics/epic.{N}.*/epic.{N}.*.md
```

### Task 4 — README index

```markdown
---
name: epic-examples-readme
description: Index of 4 real epic docs produced by /create-epic. Compare them side-by-side for tone, depth, and structure.
type: guide
status: draft
version: 0.1.0
created: 2026-05-XX
---

# Worked examples: Epics

Four real epic docs produced by `/create-epic` from the same PRD on 2026-05-11.
Each is frozen at capture time (see `source_sha` in frontmatter).

| Epic | Description | Captured copy |
|---|---|---|
| 1 | Quickstart & decision-tree entry point | [`epic.1.*.md`](./epic.1.quickstart-and-decision-tree-entry-point.md) |
| 2 | Worked PRD/epic/story examples (this very epic) | [`epic.2.*.md`](./epic.2.worked-prd-epic-story-examples.md) |
| 3 | Runbook tutorial wrappers | [`epic.3.*.md`](./epic.3.runbook-tutorial-wrappers.md) |
| 4 | First-week guided learning path | [`epic.4.*.md`](./epic.4.first-week-guided-learning-path.md) |

Parent PRD: [`examples/prd-example/prd.onboarding.md`](../prd-example/prd.onboarding.md).
```

### Task 5 — Equivalence verify

```bash
for N in 1 2 3 4; do
  SRC=$(ls docs/prd/onboarding/epics/epic.${N}.*/epic.${N}.*.md)
  DST=examples/epic-examples/$(basename "$SRC")
  diff <(grep -v '^captured_\|^source_' "$SRC") \
       <(grep -v '^captured_\|^source_' "$DST")
done
```

Expected: 4 empty diffs.

### Task 6 — Validation + status flip

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Source epics evolve mid-story | Medium | Medium | source_sha records capture point |
| Manual copy drift (someone edits captured copy) | Medium | High | CI script (follow-up task) to flag captured-copy edits |

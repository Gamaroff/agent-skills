---
id: story.2.1.plan
title: "Implementation Plan: Capture PRD as worked example"
type: plan
story-ref: story.2.1.capture-prd-as-worked-example.md
---

# Implementation Plan: Capture PRD as worked example

> Requirements: [story.2.1.capture-prd-as-worked-example.md](story.2.1.capture-prd-as-worked-example.md)

## Overview

Copy parent PRD into `examples/prd-example/` with provenance frontmatter. Author a narrative README.

## Task-by-Task Implementation Guide

### Task 1–2 — Create + copy

```bash
mkdir -p examples/prd-example
cp docs/prd/onboarding/prd.onboarding.md examples/prd-example/prd.onboarding.md
```

### Task 3 — Provenance frontmatter

Prepend (or merge into existing frontmatter) these fields on the captured copy:

```yaml
captured_skill_version: "create-prd v?.?.?"   # exact version of the skill that produced the PRD
captured_date: 2026-05-XX
source_sha: <git rev-parse HEAD at capture time>
source_path: docs/prd/onboarding/prd.onboarding.md
```

Keep all other frontmatter from the source file intact.

### Task 4 — Narrative README

```markdown
---
name: prd-example-readme
description: Narrative companion to the worked PRD example — what was easy, what required iteration, what pm-checklist flagged.
type: guide
status: draft
version: 0.1.0
created: 2026-05-XX
---

# Worked example: PRD for Onboarding & Tutorials

This is a real PRD produced by `/create-prd` against this repo on 2026-05-11.
The artifact next to this README is **not curated** — it's the exact output of
the skill, frozen at the point of capture (see `source_sha` in its frontmatter).

## What was easy
- The brownfield template's section structure required no overrides for a doc-only PRD.
- 6-signal complexity scoring produced a clean 4/6 → multiple epics was an easy call.

## What required iteration
- Epic 2 (worked examples) is meta: it consumes the outputs of the same pipeline run.
  Resolving the sequencing — Epic 2 last — surfaced during section 5.2 elicitation.
- Compatibility Requirements section had to lean on docs-only CRs; default template
  assumes API/schema changes.

## What `pm-checklist` flagged
- (Fill in real findings from the pm-checklist results inserted into PRD section 7.2.)

## How this PRD relates to the artifacts in `docs/prd/onboarding/`
- The canonical PRD lives at `docs/prd/onboarding/prd.onboarding.md`.
- The 4 epics it spawned live at `docs/prd/onboarding/epics/epic.{1-4}.*/`.
- The stories under each epic are walkable examples for `/create-story` output.
```

### Task 5 — Equivalence verify

```bash
diff <(grep -v '^captured_\|^source_' docs/prd/onboarding/prd.onboarding.md) \
     <(grep -v '^captured_\|^source_' examples/prd-example/prd.onboarding.md)
```

Expected: empty.

### Task 6 — Validation + status

Same pattern.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Source PRD evolves; captured copy goes stale | High over time | Medium | `source_sha` field enables programmatic staleness detection (follow-up task) |
| Narrative README becomes a summary, not a narrative | Medium | High (kills story's value) | Reviewer checks for 3+ specific moments per AC2 |

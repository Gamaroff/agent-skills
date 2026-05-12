---
id: story.2.3.plan
title: "Implementation Plan: Capture story messy path"
type: plan
story-ref: story.2.3.capture-story-messy-path.md
---

# Implementation Plan: Capture story messy path

> Requirements: [story.2.3.capture-story-messy-path.md](story.2.3.capture-story-messy-path.md)

## Overview

Provenance-gated capture: only proceeds if a genuine QA-gate FAIL occurred during the PRD's pipeline run. Otherwise descope.

## Task-by-Task Implementation Guide

### Task 1 — Survey for FAIL artifacts

```bash
grep -lr "PASS\|FAIL\|CONCERNS" docs/prd/onboarding/epics/*/stories/*/story.*.gate.*.yml 2>/dev/null
```

For each story, count gate iterations. A story with iteration 1 = FAIL and iteration 2 = PASS is the target shape.

### Task 2 — Descope path (if no FAIL)

If no genuine FAIL exists:

```yaml
# In this story's frontmatter:
status: cancelled
```

Body:
```markdown
**Status:** Cancelled

## Descope rationale

No story in Epics 1, 3, or 4 produced a genuine `qa-gate: FAIL` during the PRD's
pipeline run. Per AC3, manufactured failures are prohibited. Descoping rather
than fabricating preserves the meta-dogfood integrity.

This decision can be reversed if a future story in this PRD (or a follow-up PRD)
produces a real FAIL — capture it then.
```

Then STOP — do not proceed to Tasks 3+.

### Task 3 — Capture (if FAIL found)

```bash
mkdir -p examples/story-messy-path
# Variables — fill from Task 1 survey
SRC_DIR=docs/prd/onboarding/epics/epic.X.<slug>/stories/story.X.Y.<slug>
cp $SRC_DIR/story.X.Y.<slug>.md       examples/story-messy-path/story.X.Y.<slug>.md
cp $SRC_DIR/story.X.Y.gate.1.<slug>.yml  examples/story-messy-path/story.X.Y.gate.1.<slug>.yml
cp $SRC_DIR/story.X.Y.gate.2.<slug>.yml  examples/story-messy-path/story.X.Y.gate.2.<slug>.yml
# revision artifact: either the qa-fix commit's diff or the revised story doc — choose the clearer one
```

### Task 4 — Provenance frontmatter

Same pattern as Stories 2.1 + 2.2. Add `source_story` and `fail_pass_shas` (two SHAs: the FAIL commit and the PASS commit).

### Task 5 — Narrative README

```markdown
# Worked example: a story that failed QA, then passed

The story captured here genuinely failed `qa-gate` during the PRD's pipeline run
on 2026-05-XX. Nothing is manufactured.

## What triggered the FAIL

Gate 1 (`story.X.Y.gate.1.<slug>.yml`) shows the failing finding:
> [Quote the exact line from the YAML — e.g., "AC3 verification step did not pass: doc exceeds 400-line cap."]

The story's developer hit this because [concrete reason — extract from implementation report].

## What the revision did

Between the FAIL commit (`<sha1>`) and the PASS commit (`<sha2>`):
- [Concrete change 1 — e.g., "Trimmed Section X from 80 lines to 35"]
- [Concrete change 2]

The PASS gate (`story.X.Y.gate.2.<slug>.yml`) records the resolved findings.

## What to take away

[1–2 sentences: when you hit a similar FAIL, here's the shape of the fix.]
```

### Task 6 — Validation + status

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| No genuine FAIL occurs | Medium | High (story descoped) | Descope path documented; not a failure of this story |
| Manufactured FAIL slips in | Low | Critical (kills meta-dogfood integrity) | AC3 explicit; Task 6 verifies via git log |
| Multiple FAILs — wrong one picked | Low | Low | Pick clearest pedagogical case; reasoning in README |

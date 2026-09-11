---
id: task.117.plan
title: "Implementation Plan: a label is not a body"
type: plan
task-ref: task.117.card-preflight-heading-only.md
---

# Implementation Plan: a label is not a body

> Requirements and success criteria: [task.117.card-preflight-heading-only.md](task.117.card-preflight-heading-only.md)

## Overview
Population form: the corpus test is the deliverable; the summariser fix is what makes it go to zero.

## Phase-by-Phase Implementation Guide
### Phase 1 — `card-preflight-corpus.test.mjs`: `readdirSync("docs/tasks")` → for each task doc, `checkCardSections(text, "task")` → collect `heading-only`; assert visited ≥ 100; assert count === 0 (initially 15 — commit the test red? No: commit it with the fix, but record the pre-fix count in the implementation report).
### Phase 2 — `summariseSection`: when the first non-blank line matches `^\*\*[^*]+\*\*:?$` and the next non-blank line is a list item, skip the label and classify as list. New kind `heading-only`: summary has no sentence (`[.!?]`) and no list item.
### Phase 3 — CLI: append `scope: 3 card blocks; template completeness not checked` (or the count). Update the three `create-*` steps' wording.

## Key Patterns and References
`shared/resources/tests/*.test.mjs` for the corpus-test shape with a floor; AGENTS.md §Authoring-Time Card Preflight.

## Testing Approach
Unit + corpus + mutation.

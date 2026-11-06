---
id: task.278.plan
title: "Implementation Plan: QA loop readers read the right thing"
type: plan
task-ref: task.278.qa-loop-readers-read-the-right-thing.md
---

# Implementation Plan: QA loop readers read the right thing

> Requirements and success criteria: [task.278.qa-loop-readers-read-the-right-thing.md](task.278.qa-loop-readers-read-the-right-thing.md)

## Overview

Edit `shared/resources/` sources with the Edit tool, one hunk per call; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1: The gate reader

In `qa-diminishing-returns.js`, `readKeysInto` (`:263`) runs `KEY_RE` over each line of an entry (`:217`, `:226`). Find where lines are fed in and pass only top-level key lines (a key at the entry's indent, not inside a `>-`/`|` block scalar or a quoted value); reuse `flowSpan` (`accept-qa-residual.js:150`) for flow entries if the two readers share it. Add the planted quoted `status:waived` test first and see it fail. Run every reader's fixtures (`git grep -l readKeysInto`).

### Phase 2: The residue classifier

At `:810`, before `new Set(...)`, map each MEDIUM's `file` through a fold: if it matches `qa.testArtifactGlobs` (find the reader with `git grep -n testArtifactGlobs -- shared`), replace it with the production file it names by the repository's test-name convention (`tests/X.test.*` and `tests/X-*.test.*` → `X.*`), when that production file is among the other MEDIUMs. Add the fixture row beside `medium-falling-cycle5.yml` in `shared/resources/tests/fixtures/qa-diminishing-returns/`.

### Phase 3: The 5c carry

In the classifier fence (`develop-pipeline-step-5-6-qa-loop.md:1630`–`:1687`), read an optional `fix_path:`; when it is the work item's own document or a `.md` in its directory and `git diff --quiet HEAD -- <path>`, classify `fix`. Add a row for the field to `qa-findings-ingester-prompt.md`, named so it cannot be confused with `suggested_fix_path`.

### Phase 4

Mutation-prove each change with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `qa-diminishing-returns.js:263`, `:805`–`:816`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixture gates; the quoted-status plant is the non-vacuity case for Phase 1.

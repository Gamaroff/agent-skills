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

In `qa-diminishing-returns.js`, `readKeysInto` (`:263`) runs `KEY_RE` over each line of an entry (`:217`, `:226`). The line feed is already filtered by indent (`:223`–`:227`), so the defect is inside one line: `KEY_RE` scans the whole text and a quoted `status: waived` inside `finding: "…"` wins, because FIRST wins. Make `readKeysInto` read only keys at the key position: for a block line, the key at the start of the line (after any `- `); for a flow entry, keys at the top level of the mapping, skipping quoted values (reuse `flowSpan`, `accept-qa-residual.js:150`, if it can be required without a cycle, else restate its extent rule once and test both). Add the planted quoted `status: waived` tests first (a block entry and a flow entry, each with a real `status: open` after it) and see them fail. Run the other consumers of `readTopIssues` (`accept-qa-residual.js` and the suites named in the task's § 3).

### Phase 2: The residue classifier

At `:810`, before `new Set(...)`, map each MEDIUM's `file` through a fold: if it matches `qa.testArtifactGlobs` (find the reader with `git grep -n testArtifactGlobs -- shared`), replace it with the production file it names by the repository's test-name convention: the test sits in a `tests/` child of the production file's directory, so strip that segment, drop `.test.<ext>` and any `-<suffix>` (`shared/resources/tests/X.test.mjs` and `shared/resources/tests/X-differential.test.mjs` → stem `X` in `shared/resources/`), and match a production MEDIUM by directory and stem ignoring the extension. Fold only when that production file is among the other MEDIUMs. An unmatched test file stays as it is. Add the fixture row beside `medium-falling-cycle5.yml` in `shared/resources/tests/fixtures/qa-diminishing-returns/`.

### Phase 3: The 5c carry

In the classifier fence (`develop-pipeline-step-5-6-qa-loop.md:1630`–`:1687`), read an optional `fix_path:`; when it is the work item's own document or a `.md` in its directory and `git diff --quiet HEAD -- <path>`, classify `fix`. The 5c findings come from `/review-pr`, so add the optional `fix_path` where `ref` is emitted: the findings block in `shared/resources/pr-conformance-prompt.md` (`:147`) and the record in `skills/review-pr/SKILL.md` (`:792`); run `command npm run bundle` for the `review-pr` and `review-code` copies and the suites that read them. Add a row to `qa-findings-ingester-prompt.md` saying what the ingester does with it (dropped: it routes only the 5c carry), named so it cannot be confused with `suggested_fix_path`.

### Phase 4

Mutation-prove each change with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `qa-diminishing-returns.js:263`, `:805`–`:816`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixture gates; the quoted-status plant is the non-vacuity case for Phase 1.

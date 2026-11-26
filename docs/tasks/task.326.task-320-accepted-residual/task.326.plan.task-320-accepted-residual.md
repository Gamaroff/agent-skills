---
id: task.326.plan
title: "Implementation Plan: Task 320's accepted residual is closed"
type: plan
task-ref: task.326.task-320-accepted-residual.md
---

# Implementation Plan: Task 320's accepted residual is closed

> Requirements and success criteria: [task.326.task-320-accepted-residual.md](task.326.task-320-accepted-residual.md)

## Overview

Two small rule changes, one per engine, each test-first. The cases already exist as probe cases in
task 320's DoD run 2, so the tests copy their inputs.

## Phase-by-Phase Implementation Guide

### Phase 1: `partsOf` (`shared/resources/finalise-rerun-at-head.js:325`)

Today:

```js
if (comment) comment = !line.includes("-->");
else if (!fenced && line.startsWith("<!--"))
  comment = i < lastEnd && !line.includes("-->");
```

Change:

- Add `htmlBlock` state. A line that is not fenced and not in a comment, at an indent of 0–3, and that
  opens a type-6 tag (`<details`, `<div`, `<pre`, `<table`, `<section` and the rest of CommonMark's
  list) or a type-7 complete tag alone on its line, sets `htmlBlock = true`. A blank line clears it.
  `<pre` is type 1 and ends at `</pre>`, not at a blank line.
- While `htmlBlock`, open no comment and split no part.
- Replace `line.startsWith("<!--")` with a test of the line after stripping up to 3 spaces, or a list
  marker (`- `, `* `, `+ `, `1. `) and its content indent.

Inputs for the tests: `task.320.dod.2.security.cases.22.json` (plan entry 21, cases
`hostile-opener-inside-a-details-block`, `hostile-opener-inside-a-div-block`,
`legit-indented-closed-comment-with-a-fence-marker`, `legit-closed-comment-in-a-list-item`), plus the
QA report 6 variants with `<pre>` and `<table>` and with no later closer.

### Phase 2: `writtenKeys` (`shared/resources/ci-tree-equivalence.js`, read by `topLevelKeys` at `:471`)

- For a `?` key row, strip ` #…` outside quotes before reading the key.
- Collect `&name` anchors from top-level key rows and their values (`a: &k ci`). For a `*name` key row,
  read the anchored scalar as the key.

Inputs: `task.320.dod.2.security.cases.20.json` and `.21.json` (plan entries 19 and 20, cases
`hostile-explicit-key-with-a-comment`, `hostile-alias-key`).

## Key Patterns and References

- Task 320's cycle-5 fix (`7cae65a14`) added the anchor, tag and `?` forms to `writtenKeys`; extend
  that reader, do not add a second one.
- `makeFenceTracker` already decides fences; keep it the only fence reader.

## Testing Approach

- Each case red first, against the unmodified engine.
- Re-run the probe plan:
  `command node .agents/skills/finalise/references/security-probe-plan.mjs --plan docs/tasks/task.320.task-319-leftover-findings/task.320.dod.2.security.plan.json --record <scratch>/run.json --cases-base <scratch>/cases --repo-root "$(git rev-parse --show-toplevel)" --json`.
- Corpus: compare every tracked document's answer with `develop`.

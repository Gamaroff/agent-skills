---
id: task.294.plan
title: "Implementation Plan: QA snippet classifier allow-list"
type: plan
task-ref: task.294.qa-snippet-classifier-allow-list.md
---

# Implementation Plan: QA snippet classifier allow-list

> Requirements and success criteria: [task.294.qa-snippet-classifier-allow-list.md](task.294.qa-snippet-classifier-allow-list.md)

## Overview

Add a word-level allow-list to `classifyInternal` so a block is `runnable` only when every word is a provable literal. Pin the three residual shapes with real-bash tests first, then implement, then measure the docs-scan cost.

## Phase-by-Phase Implementation Guide

### Phase 1: Decide the admitted words

**Files to read:** `scripts/qa-snippets-docscan.mjs`, `shared/resources/qa-execute-snippets.mjs`.

**Exact changes:** none to the repository except the decision recorded in this plan. Measure with a scratchpad script (not committed) that calls `classifyBlock` on each of the 256 runnable docs blocks and tokenizes them with the exported tokenizer, grouping words by shape (plain literal, `$name`, `${…}`, quoted fragment, glob, brace).

Candidate lists to score against the 256:

- **A, literal-only**: no `$`, backtick, `\`-escape, glob or brace in any word.
- **B, literal plus plain `$name`** where `name` is a start-up variable the runner binds.
- **C, B plus fixed quoting** (a single-quoted or double-quoted string with no expansion).

Record the count that stays runnable for each, and the choice. Prefer the smallest list whose cost is acceptable, because every admitted class is a place to be wrong.

### Phase 2: Tests first

**Files to modify:** `shared/resources/tests/qa-execute-snippets.test.mjs`.

Add `task.294 residual shapes classify mutating`, a table whose rows are run under real bash (a marker file must appear) and then classified. Rows:

- `x=$(printf 'a[\044(touch MARK)]'); echo $((x))`
- `b='['; x="a${b}\$(touch MARK)]"; echo $((x))`
- `read x <<< "a[$""(touch MARK)]"; echo $((x))`
- the same through `printf -v`

Add `task.294 control blocks stay runnable` with ordinary safe blocks (a plain `echo`, `ls`, `grep` over literals, a pipeline of literals). Run both on today's code and record that the residual table is red.

### Phase 3: Implement

**Files to modify:** `shared/resources/qa-execute-snippets.mjs`.

Add a function `unprovableWord(tokens)` that returns the first word the chosen list does not admit, and call it in `classifyInternal` after the existing refusal rules and before the `runnable` return. The reason is `not-allow-listed: <class>`. Keep it pure and fail-closed: a word the function cannot classify is refused.

Defeat-the-first-layer test: call the existing refusal path with the allow-list check stubbed out via an `opts` flag (an exported test hook, or a direct export of `indirectEvaluationHazard`), and assert the existing rules still refuse their shapes. Name the mutation only this test turns red: removing `indirectEvaluationHazard` while leaving the allow-list in place.

### Phase 4: Measure and document

- Add `indirect-residual` atoms to `scripts/qa-snippets-differential.mjs` and run the slice on `.249`.
- Run `npm run qa-snippets:docscan`; paste the newly refused blocks and reasons into the QA report.
- Edit §2a-ii of `shared/resources/qa-runnable-prose-detection.md`: delete the "Known unseen shapes" claim and state the allow-list rule and its measured cost.
- `npm run bundle`, `npm run bundle:check`, `npm run generate-catalog` only if skill metadata changed (it does not).

### Phase 5: The two cleanups

- In the test at `qa-execute-snippets.test.mjs:5307`, pass a `helperRoot` and assert the exact `helper call with …` reason string. Mutation: swap the order of the helper rule and the start-up rule; the test must go red.
- Add `task.294 set mapfile readarray getopts trap compgen wait shift are refused as unrecognised commands`, asserting `mutating` with a reason starting `unrecognised-command`. Mutation: add one of the eight to the command table; the test must go red.

## Key Patterns and References

- One bash tokenizer (task 292): do not add a second lexer. The word check reads the tokenizer's output.
- Default-deny over detection: task 293 gates 3, 4 and 6 to 8 each lost to a listed spelling.
- Tests run under real bash: assert behaviour (a marker file), not source text.

## Testing Approach

Run tests on `ci@192.168.1.249` from a fresh clone, as task 293 did (`CI=true`, `ci:fast`); note the server lacks `zsh` and `shellcheck`, so three environmental failures are known and unrelated. Mutation-prove every change: revert the behaviour, confirm the named test goes red, restore.

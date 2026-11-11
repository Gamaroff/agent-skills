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

#### Phase 1 decision (recorded 2026-11-10, develop iteration 1)

**Measurement.** Definition: the 256 blocks `qa-snippets-docscan` reports as `runnableBase` (every fenced `bash` block of every `git ls-files '*.md'` file that `classifyBlock` calls `runnable`). Command: a scratchpad script (not committed) that runs `extractBlocks` and `classifyBlock` over `git ls-files '*.md'`, drops comments, heredoc bodies and single-quoted spans with `tokenize()`, and tests regexes on what is left. Raw-text feature counts over the 256: `$(` 22, `${` 6, `$name` 26, backtick 1, backslash 54, glob chars 83, `[` 37, `$((` 2. Candidate counts that stay runnable: A (literal-only) 97, B (A plus `$name`/`${…}`) 105, C (B plus `$(…)` and `[`) 136. These regexes read raw text, so they overstate the cost (a backslash-newline join and a `[` inside quotes count); the cost that counts is the one the implemented rule gives, measured by the docs scan in Phase 4.

**Rejected: an evaluator-scoped check ("refuse a non-literal word only in a block that holds `read`, `printf -v`, `$((` …").** Scored 236 of 256 staying runnable, but it is a deny-list of evaluating constructs: any evaluator not on it is admitted, which is what task 293 spent nine gates on. Advisor review before coding flagged it for that reason.

**Chosen: allow-list of forms plus allow-list of commands.** A non-literal form is admitted only as (1) a plain parameter (`$name`, `${name}`, `$1`, `$?`, `$#`, `$@`, `$*`, `$$`, `$!`) or (2) a command substitution `$(…)` / backtick whose body is itself checked the same way. Every other form is `not-allow-listed`: `$((…))`, `$[…]`, `${x<operator>…}`, `$'…'`, `$"…"`, a `$` before a quote, a backslash outside single quotes, process substitution. A word holding a non-literal form may appear only as an operand of a command in `NON_EVALUATING_COMMANDS` (the safe table minus `test`, plus `cd` and the safe `git` subcommands), or as the right-hand side of a plain `name=` assignment. `((`, `let`, `$((…))` and the arithmetic operators of `[[` take operands that are digits and operators only, because a bare name in arithmetic position is evaluated. `declare`/`typeset`/`local` with `-i` or `-n` are refused. An unknown construct is refused, not admitted.

**Revised during implementation (2026-11-10).** The first draft also refused every stored command substitution (`x=$(…)`) and every non-digit operand of an arithmetic test. That broke real shipped blocks pinned by task 191 (`REVIEW_N=$(next_numbered …)`) and task 77's predicate, and the docs scan showed 21 of 256 blocks lost. Measured under real bash and zsh: `[` and `test` evaluate no operand and only bash's `[[` does. So storing a value is admitted (storing is not the hazard, evaluating is), the arithmetic-operand rule applies to `[[` only, and a literal operand of a builtin outside the table must hold none of `[`, `]`, `$`, a backtick or a backslash. Added `${name:-lit}`-style defaults, and a rule that a command word never holds `=` (a subscripted assignment is evaluated by bash). Docs-scan cost fell to 5 of 256.

**Bounded claim.** The list covers the forms and commands above. A bare variable name evaluated by a construct this rule does not read as arithmetic is outside it; the differential atoms and the QA gates probe that boundary, and any finding is a row for the table, not a new rule.

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
- Add `task.294 mapfile readarray getopts trap compgen wait are refused as unrecognised commands`, asserting `mutating` with a reason starting `unrecognised-command`. Mutation: add one of the six to the command table; the test must go red. `set` and `shift` are in the command table and classify `runnable` today (measured 2026-11-10), so they are not in this test; pin their plain-form verdict in a separate case.

## Key Patterns and References

- One bash tokenizer (task 292): do not add a second lexer. The word check reads the tokenizer's output.
- Default-deny over detection: task 293 gates 3, 4 and 6 to 8 each lost to a listed spelling.
- Tests run under real bash: assert behaviour (a marker file), not source text.

## Testing Approach

Run tests on `ci@192.168.1.249` from a fresh clone, as task 293 did (`CI=true`, `ci:fast`); note the server lacks `zsh` and `shellcheck`, so three environmental failures are known and unrelated. Mutation-prove every change: revert the behaviour, confirm the named test goes red, restore.

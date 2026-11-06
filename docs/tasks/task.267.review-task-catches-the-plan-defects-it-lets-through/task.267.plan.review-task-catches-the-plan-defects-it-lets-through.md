---
id: task.267.plan
title: "Implementation Plan: review-task catches the plan defects it lets through"
type: plan
task-ref: task.267.review-task-catches-the-plan-defects-it-lets-through.md
---

# Implementation Plan: review-task catches the plan defects it lets through

> Requirements and success criteria: [task.267.review-task-catches-the-plan-defects-it-lets-through.md](task.267.review-task-catches-the-plan-defects-it-lets-through.md)

## Overview

Prose edits to three `SKILL.md` files with the Edit tool, one hunk per call; never a bundled `references/` copy.

## Phase-by-Phase Implementation Guide

### Phase 1: Sharpen five existing checks

**Files to modify:** `skills/review-task/SKILL.md`

- Step 6 item 4 (`:1288`): add "a criterion of the form 'no X in the change / anywhere' is held only by a scan test with a non-vacuity case, or must be rescoped to a documentation criterion naming file and line. Important." (obs #7)
- Check 13 (`:980`): add "when the key is a lexical matcher over shell or prose, require the claim as a bounded set: a fixture table of the shapes it catches and the known unseen shapes named, not 'any restatement'." (obs #13)
- Check 15 (`:1028`): prepend "enumerate every sentence, message or token the plan removes or rewrites, from the changed-text list and the § 7 routing edits; run the literal search once per item; record the list with hit counts", and add "search the test tree for each rewritten document's file name (`git grep -l "<basename>" -- '*.test.*' 'tests/**' 'evals/**'`) and read hits for structural pins." (obs #25, #144)
- Check 11 (`:942`): add "for a new `||`/`&&` term the plan names a test for, run the plan's mutation against the planned inputs; a term whose removal changes no planned input's outcome needs an input on which it alone decides, or must go." (obs #28)
- Check 20 (`:1100`): add "a sweep's population is derived from the retired concept's own names (files, skills, registries, every placeholder spelling in the concept's docs); after a mechanical rewrite, diff-pass changed lines mentioning legacy/old/previous/retired." (obs #60)

### Phase 2: Seven new checks

Append after check 22 (`:1118`), same form. Triggers and commands:

- 23 parity: trigger "as X does" / "exactly as X"; read the sibling's guards off its code; disposition each (shared helper / reimplemented with test / different with reason). (#22)
- 24 self-rewriting writer: trigger a refusal added to an upsert, replace-in-place engine or migrator; require "every document the writer produces is one its next write accepts" as a criterion, guard run on the output, held by a property test over a generated family. (#29)
- 25 enumerated class: trigger a new workflow/script/npm script/skill/reference file; `git grep -nE "readdirSync|git ls-files" -- '*.test.*'` and the hand-kept tables; name each reaching test and what it will require. (#90)
- 26 banned names: run the pattern from `tests/no-consumer-names.test.js` over the plan's fixture literals. (#108)
- 27 async read: trigger a read of CI, deploy, queue or background-job state; measure the state's latency against the point the read fires, cite the commands; early read is Important. (#111)
- 28 temp dirs: trigger planned `mkdtemp`; require a `finally`, `t.after` or shared-helper removal; Important. (#137)
- 29 directory readers: trigger a new file/marker/side effect in a directory; list every guard, watcher or scan reading it (`git grep` the directory name) and require the plan to name each. (#153)

Confirm the next free number with `grep -n -E "^[0-9]+\. \*\*.*\(obs" skills/review-task/SKILL.md | tail -1` before writing; adjust the headings in the task doc's QA report if it differs.

### Phase 3: Twins and mirror

- `skills/create-task/SKILL.md` § 3.5: after task 266's items, one line each for #29, #108, #111 and #137, pointing at the review check by number.
- `skills/review-story/SKILL.md`: `grep -n "Measurability" skills/review-story/SKILL.md`; if present mirror #7, and add #108 where it lists technical-accuracy checks.

### Phase 4: Evidence, bundle and sweep

Thirteen defective fixtures and thirteen controls under the QA scratch directory (never the repository). `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`. `git grep -n "review-task check" -- docs` for list restatements.

## Key Patterns and References

- Check form: `skills/review-task/SKILL.md:980` (check 13) and `:1028` (check 15).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Behavioural, per the task doc § 8.

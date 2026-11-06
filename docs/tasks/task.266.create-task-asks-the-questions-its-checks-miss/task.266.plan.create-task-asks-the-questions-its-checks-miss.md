---
id: task.266.plan
title: "Implementation Plan: create-task asks the questions its checks miss"
type: plan
task-ref: task.266.create-task-asks-the-questions-its-checks-miss.md
---

# Implementation Plan: create-task asks the questions its checks miss

> Requirements and success criteria: [task.266.create-task-asks-the-questions-its-checks-miss.md](task.266.create-task-asks-the-questions-its-checks-miss.md)

## Overview

Edit `skills/create-task/SKILL.md` § 3.5 and one shared prompt, with the Edit tool, one hunk per call. Never edit a bundled `references/` copy.

## Phase-by-Phase Implementation Guide

### Phase 1: The five items

**Files to modify:**
- `skills/create-task/SKILL.md`: four Critical items appended after `:560` in the existing shape (bold lead, `(obs #N)`, the check, the command, the remedy), and one Should Add item after `:564`.

**Exact changes:** wording sketch, to be tightened in place.

- Should Add, timing: "A wall-clock or throughput bound names the sample and the statistic (obs #31): at least five runs, the median against the bound, the load ceiling for a valid run (`uptime` beside each), and that outliers are reported, not dropped. One run on a shared host measures the host."
- Critical, population (obs #122): "When a rule parses or keys on a field of existing documents or agent output, state the population it must read and the command that measured how much of it carries the field (for example `extractSection(body, "Success Criteria")` over the N most recent task documents). A rule derived from the one artefact that prompted the task is a sample of one."
- Critical, parity (obs #134): "When a plan pairs a read-only classifier with a writer that can refuse, list each refusal reason the writer returns and the classifier state it maps to, and state a recovery that leads somewhere other than the state that produced it. Classify and refuse from one reading of the input, or list the shapes where they differ."
- Critical, second layer (obs #154): "When a phase layers a defence behind one that already blocks the same input, the Testing Strategy names the test that defeats the first layer so the second stands alone, and the mutation list predicts which mutation only that test turns red."
- Critical, seeded remedy (obs #156, `--from-observation` only): "When the seeded remedy changes an engine's verdict or refusal, grep the engine's tests for the decision it overrides. Where a suite exists, try the rule in a scratch copy against an unmodified baseline, and say in Technical Background where the remedy was narrowed."

### Phase 2: The finalise clause

**Files to modify:**
- `shared/resources/finalise-dod-ac-prompt.md:72`: append "A bound is graded on the median of at least five runs; a single run is `FAIL` with `note: \"re-measure\"`."
- Run `CI=true command node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs` before and after; if it pins the sentence, update the pin with the clause.

### Phase 3: Evidence, bundle and sweep

Write ten drafts (five motivating, five control) into the QA scratch directory, never the repository. Run `command npm run bundle`, then `command npm run bundle -- --check`. `git grep -n "Adversarial Quality Review" -- docs` for restatements.

## Key Patterns and References

- Item shape: `skills/create-task/SKILL.md:558` to `:560`.
- Control design: `create-task` § 8 "Behavioural evidence needs a control case" (obs #176).

## Testing Approach

Behavioural, per the task doc § 8; no source-text assertion stands in for it.

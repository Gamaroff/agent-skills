---
id: task.275.plan
title: "Implementation Plan: Gates say what they know"
type: plan
task-ref: task.275.gates-say-what-they-know.md
---

# Implementation Plan: Gates say what they know

> Requirements and success criteria: [task.275.gates-say-what-they-know.md](task.275.gates-say-what-they-know.md)

## Overview

Edit `shared/resources/stakeholder-summary.js`, its tests and the QA skills with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1: The count slot

- `stakeholder-summary.js:115` and `:125`: read `open_count` in the `qa-gate` and `qa-cycle` templates. Add a helper next to `GATE_MEANING` that, for `PASS` and a positive integer count, returns "The checks passed, with N minor points recorded below." (singular for 1); otherwise the existing sentence. Keep the no-slot rendering valid.
- Call sites (the five in the task document § 3; re-derive them with `call-sites.js --engine tracker-comment.js` and `--engine stakeholder-summary-cli.js`): add `--slot open_count="$(helper <gate>)"`. The count is the **open** entries of the `top_issues:` block (status absent or `open`), from one helper under `shared/resources/`, not `grep -c '^  - id:'`, which counts closed entries too (it returns 2 on task 213's gate 2, whose two entries are closed). Capture the helper's output the way `BLOCKING_COUNT` does (`|| true`, then a default), so a `grep -c` that prints `0` and exits 1 cannot double the value.
- Register `open_count` in `NUMERIC_SLOTS`; update `shared/resources/stakeholder-summary.md` (the PASS wording at `:149`, `:156`, `:170`).
- Tests: extend `stakeholder-summary.test.mjs` per the task doc § 8; run `comment-slot-coverage.test.mjs`, which derives expectations from the templates.

### Phase 2: The remedy status

- Gate schema in `qa-task/SKILL.md:1392` block and the `qa-story` sibling: add `remedy: verified | unverified` to `recommendations.future` entries, with "verified names the command or test that showed it working". Absence reads as `unverified`.
- `create-task/SKILL.md` § 3.5: one line after task 266's items: "a remedy seeded from a gate marked `unverified` (or unmarked) is a claim to run before the plan builds on it."

### Phase 3

Mutation-prove the count branch with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `shared/resources/stakeholder-summary.js:29` (`GATE_MEANING`).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests; the coverage test is the guard against a wrong slot name.

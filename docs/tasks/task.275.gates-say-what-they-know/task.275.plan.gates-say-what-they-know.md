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
- Call sites: `grep -n "qa-gate\|qa-cycle" skills/qa-task/SKILL.md skills/qa-story/SKILL.md` finds each `--slot` list; add `--slot open_count=$(…)` computed from the gate's `top_issues` length. Measure the count source with a command the plan names (for example `grep -c '^  - id:' <gate>` under `top_issues:`, or a small node read); do not type the number.
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

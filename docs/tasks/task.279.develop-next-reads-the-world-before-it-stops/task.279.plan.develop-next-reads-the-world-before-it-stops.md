---
id: task.279.plan
title: "Implementation Plan: develop-next reads the world before it stops"
type: plan
task-ref: task.279.develop-next-reads-the-world-before-it-stops.md
---

# Implementation Plan: develop-next reads the world before it stops

> Requirements and success criteria: [task.279.develop-next-reads-the-world-before-it-stops.md](task.279.develop-next-reads-the-world-before-it-stops.md)

## Overview

Edit `skills/develop-next/SKILL.md`, the two develop skills and one small script with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

At `SKILL.md:69` (0.1a) add, before "surface and STOP": read the item's document (`status: accepted`, bug `closed`) and `prNumber` state (`gh pr view` or the Bitbucket arm, as 0.1b does at `:71`); both true → report "HALT resolved out of band: {evidence}" and continue as `halted: false` through the same advance path 0.1b uses; a failed query or either missing → STOP as today, naming `halted: false` as the one-line fix. If the check is more than prose, add `skills/develop-next/scripts/halt-evidence.mjs` (`--json` with a `reason`), with a test, and call it from the step.

### Phase 2

In Step 3 (`grep -n "qualityGateCommand" skills/develop-next/SKILL.md`), add: create the worktree with `git worktree add --detach ../.qg-<id> <pr-head>`, link `node_modules`, run the gate there, remove it with `git worktree remove --force`; a red whose failing tests are `from-observation.test.js` or `test-clean-checkout.test.js` under `/tmp` is an environment failure: re-run beside the checkout before reading it as a verdict.

### Phase 3

Add to Step 0 of each orchestrator: "If the `observe-work` skill is installed and its Session Start Protocol has not run this session, run it now (once)."

### Phase 4

Fixtures under `evals/develop-next/` for the 0.1a cases; mutation-prove with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `skills/develop-next/SKILL.md:69`–`:71`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with run-state fixtures; behavioural evidence for the prose lines.

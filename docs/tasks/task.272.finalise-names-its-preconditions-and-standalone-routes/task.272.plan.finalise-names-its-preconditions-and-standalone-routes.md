---
id: task.272.plan
title: "Implementation Plan: finalise names its preconditions and standalone routes"
type: plan
task-ref: task.272.finalise-names-its-preconditions-and-standalone-routes.md
---

# Implementation Plan: finalise names its preconditions and standalone routes

> Requirements and success criteria: [task.272.finalise-names-its-preconditions-and-standalone-routes.md](task.272.finalise-names-its-preconditions-and-standalone-routes.md)

## Overview

Edit `skills/finalise/SKILL.md`, `skills/finalise/references/resolve-pr-number.sh` (via its `shared/resources/` source) and one new script, using the Edit tool. Never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

Ask with `AskUserQuestion`: for a bug finalised after its branch merged, where does the acceptance commit go (a branch off `develop` with a PR, or a direct docs commit)? Record the answer here.

**Answered 2026-11-08 (owner):** a docs-only branch off `develop` with a PR. The base branch is never pushed to directly. The bug route in `skills/finalise/SKILL.md` must state this.

### Phase 2: The preflight

Model on `finalise-record-preflight.js` (`skills/finalise/SKILL.md:536`–`:548`): a `check --doc … --json` CLI returning a `reason` and a `missing[]` list. Inputs: the gate files (`{dir}/*.gate.*.yml`), `approved_by` on a `WAIVED` gate, the newest `*.pr-review.*.md`, `reviewDecision` and PR state via `pr-read.sh`. Call it at Step 0 and print the named route on non-zero. Add a `preconditions` row to the bug-mode table and the matching `**Bug mode (\`preconditions\`):**` marker.

### Phase 3: Bug route

`resolve-pr-number.sh`: add a rung that reads the bug's `github_issue` and finds the linked PR (`gh pr list --search`) after the explicit and branch rungs. 7.7: when no implementation report exists, read `**Verification Result**` from `#### QA Verification`; `✅ Fixed` is the verdict, anything else is a gap. 6a: per Phase 1.

### Phase 4

Tests; mutation proofs with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `evals/shared/tests/finalise-bug-mode.test.mjs` (table/marker agreement).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with scratch directories and `gh` stubs.

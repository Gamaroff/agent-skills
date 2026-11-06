---
id: task.283.plan
title: "Implementation Plan: Authoring and fix steps state the rules they keep missing"
type: plan
task-ref: task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md
---

# Implementation Plan: Authoring and fix steps state the rules they keep missing

> Requirements and success criteria: [task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md](task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)

## Overview

Edit sources with the Edit tool, one hunk per call; never a bundled copy. Four independent phases.

## Phase-by-Phase Implementation Guide

### Phase 1

`git grep -n "anchors resolve" -- skills/review-task` finds check 2; add the placement claim ("under `[Unreleased]`" verified with `grep -n "^## \[" CHANGELOG.md`). Ask the owner which fix point (5c CHANGELOG-only relocation vs a Step 3 check) before editing the QA-loop doc.

### Phase 2

Add a "Multi-task path" subsection after `skills/create-task/SKILL.md:268`'s procedure: allocate the range from the registry, one writer per directory, one registry pass at the end. Write the renderer as a script (node, parses frontmatter with the repository's parser, not a regex), test first against a fixture whose description spans lines; point `ensure-task-github-issue` at it.

### Phase 3

Add the importer-audit rule to `develop-bug`'s fix step and `qa-fix`: `git grep -l "<function>"` for importers, list the writers, state why newly accepted input is safe for each.

### Phase 4

Add the wrapper line to `docs/contributing/traps.md` beside the `command node` rule, and update the project memory note.

### Phase 5

Mutation-prove the renderer with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `skills/create-task/SKILL.md:268`; `docs/contributing/traps.md`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixture tasks; behavioural evidence for the prose rules.

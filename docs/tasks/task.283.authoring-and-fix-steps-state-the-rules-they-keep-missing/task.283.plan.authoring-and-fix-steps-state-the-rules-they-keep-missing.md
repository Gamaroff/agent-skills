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

`git grep -n "Line anchors resolve" -- skills/review-task` finds the bullet in Step 3 check 2; add the placement claim ("under `[Unreleased]`" verified with `grep -n "^## \[" CHANGELOG.md`). The fix point is decided: add a fenced shell block to `shared/resources/develop-pipeline-step-3-develop-loop.md` that fails when a new CHANGELOG entry sits below the first `## [v` heading, and a test under `shared/resources/tests/` that extracts and runs it (released-section entry fails, `[Unreleased]` entry passes). No 5c exception. Re-bundle afterwards.

### Phase 2

Add a "Multi-task path" subsection after `skills/create-task/SKILL.md:268`'s procedure: allocate the range from the registry, one writer per directory, one registry pass at the end. Write the renderer as a node script under `shared/resources/` that imports `jira-sync.js` (`parseFrontmatter`, `buildCardSections`) and holds no cap or regex of its own. Test first against a fixture whose description spans lines. Point `ensure-task-github-issue` at it, decide `sync-github-task` (carried or out of scope, said in the skill), and lower the pinned `issue-body.md` heredoc count in `shared/resources/tests/payload-heredoc-ratchet.test.mjs`. Run `pipeline-answers-generic.test.mjs` and `bundle --check` on the new file.

### Phase 3

Add the importer-audit rule to `develop-bug`'s Step 3 (Investigate & Fix) and `qa-fix`'s Step 3 (Apply Changes): `git grep -l "<function>"` for importers, list the writers, state why newly accepted input is safe for each.

### Phase 4

Add the wrapper line to `docs/contributing/traps.md` beside the `command node` rule. The project memory note is outside the repository and not part of this change.

### Phase 5

Mutation-prove the renderer with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `skills/create-task/SKILL.md:268`; `docs/contributing/traps.md`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixture tasks; behavioural evidence for the prose rules.

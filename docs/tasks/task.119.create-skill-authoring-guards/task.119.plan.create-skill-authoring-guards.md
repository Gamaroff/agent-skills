---
id: task.119.plan
title: "Implementation Plan: rules where authors read"
type: plan
task-ref: task.119.create-skill-authoring-guards.md
---

# Implementation Plan: rules where authors read

> Requirements and success criteria: [task.119.create-skill-authoring-guards.md](task.119.create-skill-authoring-guards.md)

## Overview
Guard first (so the 12 sites are measured), then the rules, then the create-task step.

## Phase-by-Phase Implementation Guide
### Phase 1 — guard: extract fenced blocks with a `bash`/`sh` info string; regex `(?<!\\)\$[0-9]`; allowlist `{file, line, reason}`; floor on blocks scanned.
### Phase 2 — rules in create-skill: "Runnable prose" (positional tokens: bare `/re/` tests `$0`, `length` with no arg, `cut -f2` for `awk '{print $2}'`; where unavoidable, allowlist + note), "Shell matrices" (`zshAvailable()`, bash unconditional, `zsh-unavailable` note), "Comments are dependency declarations" (bare filenames in `.js` comments).
### Phase 3 — bundler: in the reference scan, if the matched line's stripped form starts with `//`, `*` or `#`, print `⚠️ comment-only reference: <file>:<line> → <target>`; test with a fixture.
### Phase 4 — create-task §1.25 "One task or several?": shippable ∧ revertible ∧ valuable; seams primitive→migration, per-axis, substantive→cleanup; one registry note per split; anti-pattern: split by file.

## Key Patterns and References
`tests/mutation-call-site-coverage.test.js` for the allowlist-with-reason shape; `docs/tasks/task-registry.md` rows 51–58 for the note format.

## Testing Approach
Mutation per rule; run every edited bash block with `qa-execute-snippets` before/after.

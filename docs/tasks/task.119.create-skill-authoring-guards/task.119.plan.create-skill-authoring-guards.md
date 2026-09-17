---
id: task.119.plan
title: "Implementation Plan: rules where authors read"
type: plan
task-ref: task.119.create-skill-authoring-guards.md
---

# Implementation Plan: rules where authors read

> Requirements and success criteria: [task.119.create-skill-authoring-guards.md](task.119.create-skill-authoring-guards.md)

## Overview
Phase 0 first (settle what the harness renders and whether `\$0` escapes — the guard's scope and regex depend on it), then the guard (so the sites are measured), then the rules, then the create-task step.

## Phase-by-Phase Implementation Guide
### Phase 0 — verify: two scratch skills invoked with an argument — one Reads a sibling reference carrying `$0`–`$2`, one carries `\$0` inline; record both results in the guard test header; fix scope and regex from them.
### Phase 1 — guard: extract fenced blocks with a `bash`/`sh` info string; regex `(?<!\\)\$[0-9]`; allowlist `{file, line, reason}`; floor on blocks scanned.
### Phase 2 — rules in create-skill: "Runnable prose" (positional tokens: bare `/re/` tests `$0`, `length` with no arg, `$(2)` for `awk '{print $2}'` — not `cut -f2`, which is tab-delimited; where unavoidable, allowlist + note), "Shell matrices" (`zshAvailable()`, bash unconditional, `zsh-unavailable` note), "Comments are dependency declarations" (bare filenames in `.js` comments).
### Phase 3 — bundler: in the reference scan, if the matched line's stripped form starts with `//`, `*` or `#`, print `⚠️ comment-only reference: <file>:<line> → <target>`; `tests/bundle-comment-origin.test.js` (JS driving the Python script, like the other `tests/bundle-*.test.js`) — fixture proves the warning fires, live-tree assertion proves the tree is clean, allowlist with reason.
### Phase 4 — create-task §1.2 "One task or several?": shippable ∧ revertible ∧ valuable; seams primitive→migration, per-axis, substantive→cleanup; one registry note per split; anti-pattern: split by file.

## Key Patterns and References
`tests/mutation-call-site-coverage.test.js` for the allowlist-with-reason shape; `docs/tasks/task-registry.md` rows 51–58 for the note format.

## Testing Approach
Mutation per rule; run every edited bash block with `qa-execute-snippets` before/after.

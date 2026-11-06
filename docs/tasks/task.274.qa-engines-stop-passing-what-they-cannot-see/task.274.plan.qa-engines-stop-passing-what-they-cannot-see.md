---
id: task.274.plan
title: "Implementation Plan: QA engines stop passing what they cannot see"
type: plan
task-ref: task.274.qa-engines-stop-passing-what-they-cannot-see.md
---

# Implementation Plan: QA engines stop passing what they cannot see

> Requirements and success criteria: [task.274.qa-engines-stop-passing-what-they-cannot-see.md](task.274.qa-engines-stop-passing-what-they-cannot-see.md)

## Overview

Edit `shared/resources/` sources with the Edit tool, one hunk per call; never a bundled copy. Each fix: control test first, then the change, then a mutation proof.

## Phase-by-Phase Implementation Guide

### Phase 1

`AskUserQuestion`: (a) obs #67 shape 4: refuse a variable argument to a deny-listed command, or track values; (b) obs #52: `shared_files` in the cases file, or `--fixture-copy <repo-path>`. Record here.

### Phase 2: The snippet runner

- `classifyInternal` / `stripNonCode`: make `stripProse` idempotent (neutralise the heredoc operator it keeps) so the second pass cannot read every line after the opener as body; `collapseQuotedSpans` keeps `$(…)` and backticks inside double-quoted spans; run `DENY_PATTERNS` over an unquoted copy of the prose too.
- Syntax check: for every block refused as mutating or placeholder-free, run `bash -n` (and `zsh -n` when present) on a temp file inside `mktemp -d`; a failure is a `high` finding `execution-failure`, separate from the refusal.
- Measure: run the runner over every executed doc (`SKILL.md`, `shared/resources/*.md`) before and after; list newly refused blocks with the command; fix or annotate each.

### Phase 3: The probe record

- `security-probe.mjs --record`: key a JS-entry control by sink + entry + name; a test records two names and reads both back.
- Shared fixtures per Phase 1: copy once per run; the numbered cases file stays within the precedent's order of magnitude.

### Phase 4: status-history

- `status-history.js`: read the first table header under `## Status History`, count columns, compare with the row to append; mismatch → exit 2 naming the file and both counts, or write in the header's shape per Phase 1. Test with a three-column table that fails on today's engine.

### Phase 5

`command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`. `git grep -n "no-executable-blocks\|--record" -- skills shared docs` for prose that restates behaviour.

## Key Patterns and References

- `shared/resources/status-history.js:40`–`:55`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests; the qa-execute-snippets test is load-flaky, so re-run it alone before believing a red.

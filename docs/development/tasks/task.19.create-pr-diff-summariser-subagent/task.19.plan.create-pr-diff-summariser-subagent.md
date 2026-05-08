---
id: task.19.plan
title: "Implementation Plan: create-pr diff summariser subagent"
type: plan
task-ref: task.19.create-pr-diff-summariser-subagent.md
---

# Implementation Plan — Task 19

> Requirements and success criteria: [task.19.create-pr-diff-summariser-subagent.md](task.19.create-pr-diff-summariser-subagent.md)

## Overview

Capture `git diff base...HEAD` to a file; dispatch Explore subagent to author PR body sections; consume markdown directly.

## Phase 1 — Diff capture

In `skills/create-pr/SKILL.md` PR-body composition step:

```bash
DIFF_FILE=".claude/state/pr-diff-$(date +%s).patch"
git diff "$BASE...HEAD" > "$DIFF_FILE"
```

Honour any `--exclude` pathspecs (already passed to git diff via existing handling).

## Phase 2 — Summariser prompt

`shared/resources/pr-body-summariser-prompt.md` (new):

```
Read <DIFF_FILE>. Produce markdown PR body, exactly these sections:

## Summary
- 3 bullets max, plain prose (no jargon)

## Changes
Group by top-level directory. Each group: ≤4 bullets.

## Test plan
Checkbox list of what to verify, ≤6 items.

## Concerns (omit if none)
Risky/unusual changes a reviewer should focus on.

Output markdown only. ≤80 lines total.
If diff exceeds 5000 lines: replace Changes section with file-count summary by directory.
```

## Phase 3 — Wire body into gh / Bitbucket

Replace inline body composition. Both `gh pr create --body` and Bitbucket REST PUT consume the markdown returned by subagent. Cleanup: rm `$DIFF_FILE` after PR creation.

## Key References

- Existing platform branching: `shared/resources/resolve-platform.sh`
- PR template (if any): check `.github/PULL_REQUEST_TEMPLATE.md`

## Testing Approach

1. Multi-area branch (5+ files across 3 dirs) → Changes grouped correctly
2. Single-file branch → body proportional, no padding
3. 6000-line diff → file-count fallback engaged
4. With `--exclude docs/`: confirm doc paths absent from summary

---
id: task.282.plan
title: "Implementation Plan: review-task resolves the right task and reports every review"
type: plan
task-ref: task.282.review-task-resolves-the-right-task-and-reports-every-review.md
---

# Implementation Plan: review-task resolves the right task and reports every review

> Requirements and success criteria: [task.282.review-task-resolves-the-right-task-and-reports-every-review.md](task.282.review-task-resolves-the-right-task-and-reports-every-review.md)

## Overview

Edit `shared/resources/` and `skills/review-task/SKILL.md` with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

Read `tracker-comment.js:100`–`:111`. Add `review-task` and `review-story` to the numeric-suffix list (as `review-task-N`), mirror it in `stakeholder-summary.js`'s catalogue and `COMMENT_STAGES`, and update the contract. Pass the report number at both call sites (`git grep -n -- "--stage review-task" -- shared skills`). Write the two-reviews test first and see it fail.

### Phase 2

Edit the Step 2 skip rule so `already` counts only when the marker matches this run's report number. In `review-task/SKILL.md` Input Resolution, add the task-id-first order, with `git worktree list` and `git log --all -- 'docs/tasks/task.{N}.*'` for another branch.

### Phase 3

Mutation-prove each with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `tracker-comment.js:100`–`:111`; `skills/review-task/SKILL.md:80`, `:141`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with a stubbed tracker; a fixture repo for resolution.

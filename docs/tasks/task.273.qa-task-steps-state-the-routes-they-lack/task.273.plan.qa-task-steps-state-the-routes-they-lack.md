---
id: task.273.plan
title: "Implementation Plan: qa-task steps state the routes they lack"
type: plan
task-ref: task.273.qa-task-steps-state-the-routes-they-lack.md
---

# Implementation Plan: qa-task steps state the routes they lack

> Requirements and success criteria: [task.273.qa-task-steps-state-the-routes-they-lack.md](task.273.qa-task-steps-state-the-routes-they-lack.md)

## Overview

Prose edits to `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` and `shared/resources/` sources, with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

- `qa-task/SKILL.md:890` (Step 3c; re-grep "Run the proofs after the Step 3b diff reviewer"): extend the sentence: no other process may read the tree during a mutation, including a backgrounded suite or fast gate; wait, or `git worktree add --detach "$(mktemp -d)" HEAD`; a suite result whose run overlapped a mutation window is re-run before it is recorded. Mirror in `shared/resources/mutation-proving.md` rule list.
- `shared/resources/code-review-prompt.md`: add "if you execute anything, do it in the directory `{REVIEW_SCRATCH}` and never write outside it". Step 3b creates it with `mktemp -d` beside the existing `mktemp` calls (`:456`). Add: a probe the caller runs while a reviewer is live starts with a known-good calibration case.

### Phase 2

- Docs-only branch: new `shared/resources/qa-docs-only-review-prompt.md` (check each changed claim against the source it names; same findings YAML as `code-review-prompt.md`); Step 3b chooses it when every changed path matches `ci.docsOnly.patterns` (grep the key's definition first); Review Methodology records the branch. Mirror in `qa-story` Phase 1.6.
- Reproduced route: at the Step 3b promotion rule (`grep -n "confidence: high" skills/qa-task/SKILL.md`), add the paragraph from the task doc § 3.

### Phase 3

- `qa-task` criterion rule: "for any 'tool X passes on files Y' criterion, run one probe that X processes Y (a malformed copy, or the tool's file count) before recording PASS."
- `review-task` (a check after those task 267 adds) and `create-task` § 3.5: flag a criterion naming a tool on a file type an ignore file excludes; suggest a check that reaches the files (`doc-links.js`, `markdown-link-check`).

### Phase 4

Fixtures and controls in the QA scratch directory only. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `qa-task/SKILL.md:444` (Step 3b), `:882` (Step 3c).
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Behavioural, per the task doc § 8.

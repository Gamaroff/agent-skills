---
id: task.115.plan
title: "Implementation Plan: publish after the last write"
type: plan
task-ref: task.115.finalise-publish-time-checks.md
---

# Implementation Plan: publish after the last write

> Requirements and success criteria: [task.115.finalise-publish-time-checks.md](task.115.finalise-publish-time-checks.md)

## Overview

Four checks, one boundary: everything that leaves the repo happens after the last write.

## Phase-by-Phase Implementation Guide
### Phase 1 — header: delete the field; grep `IN PROGRESS` across finalise + asset; update Step 5.
### Phase 2 — CI: find the rollup helper; call it again after the push; HALT reason `ci-not-green-on-acceptance-head`.
### Phase 3 — remote refs: `git ls-files --error-unmatch <artifact>` and `git show origin/$BRANCH:<path> | grep -q <marker>`; remove output suppression on commits.
### Phase 4 — CHANGELOG: convention `(task N)`/`(bug N)` in the entry's first line; test walks accepted task docs whose `pr_number` merge is an ancestor of HEAD and greps `[Unreleased]`; finalise Step 7 greps the same and warns.

## Key Patterns and References
task.103's registry-tick + drift-test pairing; `docs/contributing/traps.md`.

## Testing Approach
Mutation: delete one entry → the test names the task; forge a contradicting DoD → the pre-post check refuses.

# Bug Report: Task 283 - sync-github-task calls the renderer against the Migration criterion

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-19

## Description
The Migration criterion says the renderer is called only on `ensure-task-github-issue`'s create path, so no existing issue body changes. `skills/sync-github-task/SKILL.md` (the update path) now calls it too.

## Steps to Reproduce
`git grep -n render-task-issue-body -- 'skills/*/SKILL.md'` lists two skills.

## Expected Behavior
Only the create path calls the renderer.

## Actual Behavior
The update path rewrites existing issue bodies on the next sync.

## Impact
Violates a success criterion; changes live issue bodies.

## Developer Fix Cycle (qa-fix cycle 1)

Restored `skills/sync-github-task/SKILL.md` to `origin/develop` and added one sentence saying the renderer is out of scope for the update path. Removed the four bundled copies it had pulled in (`git rm`; the bundler reported them `UNREACHED`). `git diff origin/develop --stat -- skills/sync-github-task` is now that one line, and `npm run bundle -- --check` reports 0 problems.

## Recommendation
Revert the `sync-github-task` hunk and the bundled copies it caused (`npm run bundle` removes none; `git rm` them), and state in that skill that the renderer is out of scope for the update path. A criterion edit needs a named approver.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | Closed | qa-task | Verified by task.283.qa.2 |

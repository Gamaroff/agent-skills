# Bug Report: Task 283 - Renderer prints the priority un-normalised

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-8
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (code-review CR-3 and CR-5, reproduced)
**Date Found**: 2026-11-20

## Description
`render-task-issue-body.js` prints the raw frontmatter priority in the Metadata table. The replaced `ensure-task-github-issue` template printed `${priority}`, which that skill defines as lowercase with a default of `medium` (SKILL.md line 32). The test at `render-task-issue-body.test.mjs:55` asserts the un-normalised value.

## Steps to Reproduce
Render a task with `priority: High`: `| Priority | High |`. Render one with no priority: `| Priority | — |`.

## Expected Behavior
`| Priority | high |` and `| Priority | medium |`, matching the old template and the shape `sync-github-task` rebuilds.

## Actual Behavior
`High` and `—`.

## Impact
The create path no longer matches the update path's rebuilt body, so the "create to update is diff-stable" sentence in `sync-github-task` is false and the first sync rewrites the body.

## Developer Fix Cycle (qa-fix cycle 2)

`priorityCell` lowercases the value and defaults to `medium`, as `ensure-task-github-issue` Step T1 defines. The older assertion that expected `High` now expects `high`, and a new test covers the lowercase and the default. Mutation proof: putting the raw `cell(...)` back turned both tests red. The effort cell prints `—` where the old template literally printed `—h` for a missing value; the renderer's form is kept, since `—h` is a template artefact.

## Recommendation
Lowercase the priority and default it to `medium` in the renderer. Assert both in the test. Check the effort cell against the old template the same way.

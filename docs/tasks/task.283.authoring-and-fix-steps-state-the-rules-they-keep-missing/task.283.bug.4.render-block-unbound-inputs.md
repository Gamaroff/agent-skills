# Bug Report: Task 283 - Render block leaves its inputs unbound

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-4
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (code-review CR-2)
**Date Found**: 2026-11-19

## Description
The render block in `skills/ensure-task-github-issue/SKILL.md` reads `TASK_RELATIVE_PATH` and `DOC_URL`, which an earlier fenced block assigns. Each fenced block is its own shell.

## Steps to Reproduce
Run the render block alone: `--file`, `--doc-url` and `--rel-path` expand empty and the script exits 2.

## Expected Behavior
The block binds or checks its inputs and HALTs naming the variable.

## Actual Behavior
A usage error before any issue is created.

## Impact
Issue creation fails when the blocks are run separately.

## Developer Fix Cycle (qa-fix cycle 1)

The render block in `skills/ensure-task-github-issue/SKILL.md` now starts with two `:` guards that HALT naming `TASK_RELATIVE_PATH` and `DOC_URL` when either is unbound. The `sync-github-task` twin (CR-1) went away with bug 2.

## Recommendation
Re-bind both inside the block, with a `:` guard (`: "${DOC_URL:?...}"`) that names the variable.

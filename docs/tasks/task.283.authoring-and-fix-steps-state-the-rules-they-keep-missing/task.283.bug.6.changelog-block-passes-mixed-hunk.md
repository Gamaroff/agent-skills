# Bug Report: Task 283 - CHANGELOG block passes a mixed hunk

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (code-review CR-1, reproduced)
**Date Found**: 2026-11-20

## Description
The Step 3 CHANGELOG block flags a new bullet only when its whole `-U0` hunk is a pure insertion (`old == 0`). Editing a shipped bullet and adding a new one beside it is one hunk with `old = 1`, so the misplaced entry passes.

## Steps to Reproduce
In a scratch repo, base CHANGELOG with a shipped bullet under the first `## [v` heading. Change that bullet and add a new bullet directly under it, then run the block with `{base}` set to `develop`.

## Expected Behavior
Exit 1 with the HALT naming the line, as the pure-insertion control does.

## Actual Behavior
Exit 0, no output. The control (pure insertion) exits 1.

## Impact
The guard misses the case where a shipped entry is edited in the same change, which is the usual shape of a changelog touch-up.

## Developer Fix Cycle (qa-fix cycle 2)

The block now judges each hunk: one that adds more bullets than it removes holds new entries, and its trailing surplus lines are the ones checked. A one-for-one edit still passes. New test (bash and zsh): an edit beside a new entry fails. Mutation proof: replacing the surplus rule with the old `old == 0` rule turns that test red.

## Recommendation
Judge each added line on its own, for example a line at or below the first release heading whose text is absent from the base file. Add a mixed-hunk test under bash and zsh and mutation-prove it.

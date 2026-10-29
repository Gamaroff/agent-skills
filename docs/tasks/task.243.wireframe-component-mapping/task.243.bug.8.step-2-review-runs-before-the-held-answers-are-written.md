# Bug Report: Task 243 - Step 2's review runs before the held wireframe answers are written

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

QA cycle 2 moved the component-table writes from 0d to Step 3, so Step 2 (`/review-task` or
`/review-story`) now runs between them. Both reviews report any node that neither the map nor the
document's table settles as **Important**. A node the person has just answered in 0d is therefore
reported as open: it costs readiness score and can push the verdict to NO-GO. The review's apply
mode can also act on it.

The review skills' wording assumes the reverse order. It says the develop pipeline's Phase 0 "asks
about whatever is still open" after the review (`skills/review-task/SKILL.md:1356`,
`skills/review-story/SKILL.md:1410`), but Phase 0 always runs before Step 2.

## Steps to Reproduce

1. Run `/develop-task` on a task with an open wireframe node, and answer it in 0d.
2. Step 2's review lists that node as an Important finding.

## Expected Behavior

Answers given in 0d are in the document before Step 2 reads it.

## Actual Behavior

The review sees the document as it was before the person answered.

## Recommendation

Write the held answers once the branch exists and before Step 2, at Step 1's post-branch steps.
Correct the two review skills' sentence.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: cycle 2 placed the writes at Step 3, after Step 2's review.

**Fix**: the writes run in Step 1, after the stash is restored and before Step 1 is marked done, so
Step 2 reads the completed table. `review-task` and `review-story` now say that inside the develop
pipelines Phase 0 has already asked and Step 1 has written the answers, so a node still open at
Step 2 was not answered.

**Testing**: "develop Phase 0 resolves in 0c-wire and asks in 0d" asserts that Step 1's Wireframe
writes section comes before its Post-Branch Steps. Mutation-proven: putting a Post-Branch heading
ahead of the section turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 3 (code review CR-2), confirmed against the review skills' wireframe axis |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 3) |

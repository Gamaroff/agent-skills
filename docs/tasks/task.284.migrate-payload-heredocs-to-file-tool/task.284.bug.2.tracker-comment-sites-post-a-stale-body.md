# Bug Report: Task 284 - tracker-comment post blocks can re-post the previous comment

**Task**: [Link](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Bug ID**: TASK-284-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-2, confirmed against the base)
**Date Found**: 2026-11-20

## Description

Each tracker-comment site wrote `.claude/state/comment-body.md` with a heredoc in the same block that
posted it. The migration splits the write (file tool) from the post (a later call) and cites
`file-write-rules.md#fresh-body-post`, but none of the post blocks asserts the body is this run's. The
sites are the pipeline step docs 0, 2, 3, 4 and 7, `create-pr` (two arms), `finalise` (two), and
`review-bug`, `review-story` and `review-task`. `qa-task` and `qa-story` keep their read-back guard but
do not check the body either.

## Steps to Reproduce

1. Leave `.claude/state/comment-body.md` from an earlier post in place.
2. Skip or fail the file-tool write.
3. Run the post block: `tracker-comment.js` posts the old body (a stage marker can suppress a repeat
   only when the stage is the same).

## Expected Behavior

A missing file stops the post, and a file left from an earlier post cannot be posted again.

## Actual Behavior

The earlier body is posted.

## Impact

A wrong comment is published to a tracker issue or PR, naming the wrong PR or verdict.

## Recommendation

In each post block, HALT when the body file is missing or empty, and delete it after the post, so a
later post cannot reuse it. Keep the existing guards in the QA blocks.

## Developer Fix Cycle

### Iteration 1

**Root cause**: every call site writes `.claude/state/comment-body.md`, a fixed path, and posts it in a
later call. Nothing removed the file, so a skipped write left the previous body in place.

**Fix**: the rule lives once, in the engine. `shared/resources/tracker-comment.js` removes `--body-file`
when the outcome is `posted`, `already` or `deferred`; other outcomes keep it for a retry. A later call
with no new write then fails with exit 2 (missing file), which every site already treats as a stop. That
covers the step docs 0, 2, 3, 4 and 7, `create-pr`, `finalise`, the three `review-*` skills, the QA
tracker comments and the pause hook. The two QA PR comments use `gh pr comment --body-file` directly, so
`qa-task` and `qa-story` stop when the body file is missing or empty and remove it after the post attempt.
`file-write-rules.md#fresh-body-post` (step 3) and `tracker-comment-contract.md` state the rule.

**Tests**: four new tests in `shared/resources/tests/tracker-comment.test.mjs` (posted and already consume
the file, an unverifiable outcome keeps it, a second call with no write is refused). Mutation proof: with
the consuming set emptied, three of them went red (posted, already, second-call refusal); restored with
`cmp` clean. Four older tests reused one body file across calls and now write it before each call.

**Importers audited** (`git grep` of the engine): every caller passes a throwaway state file; none passes
a durable file.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | Ready for QA | qa-fix | Fix applied in QA cycle 1; verification in the next gate |

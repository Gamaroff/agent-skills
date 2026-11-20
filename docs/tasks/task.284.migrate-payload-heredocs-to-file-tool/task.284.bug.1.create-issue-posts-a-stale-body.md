# Bug Report: Task 284 - create-issue can post the previous run's body

**Task**: [Link](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Bug ID**: TASK-284-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-1, confirmed against the base)
**Date Found**: 2026-11-20

## Description

`skills/create-issue/SKILL.md` used to build the issue body with `body_file=$(mktemp)` and a heredoc in
one block, so every run posted a body written in that run. The migration moved the body to the fixed
path `.claude/state/issue-body.md`, written by the file tool in an earlier call. The pre-flight
validation block and the three create arms read that path, and none of them checks that the file is
this run's.

## Steps to Reproduce

1. Leave `.claude/state/issue-body.md` from an earlier issue in place.
2. Skip or fail the file-tool write for the new issue.
3. Run the pre-flight block: the token grep passes on the old body, and the create arm posts it.

## Expected Behavior

A missing or stale body file stops the create before anything is posted, as the
`file-write-rules.md#fresh-body-post` recipe requires (assert a line only this cycle's body carries).

## Actual Behavior

The create posts the previous body.

## Impact

A wrong issue body is published to Jira, GitHub or Bitbucket. The old heredoc made this impossible.

## Recommendation

Delete the body file after the create (the `rm -f` block already exists), and make the pre-flight
block HALT when the file is absent or does not contain the issue title.

## Developer Fix Cycle

### Iteration 1

**Root cause**: the migration moved the body from a fresh `mktemp` file written in the posting block to
a fixed path written in an earlier call. The pre-flight block also read that path with `grep` inside an
`if`, and `grep` on a missing file exits 2, which `if` reads as "no tokens", so an absent file passed.

**Fix** (`skills/create-issue/SKILL.md`, pre-flight block): HALT when the file is missing or empty, and
HALT when it does not carry this issue's document file name (the `{issue-file-name}` slot, the name the
body's `Local Doc` line ends with), as `file-write-rules.md#fresh-body-post` requires. The existing
cleanup block already removes the file after a create.

**Verification for QA**: read the pre-flight block; it refuses an absent file, an empty file and a file
that names another document, and it still refuses an unsubstituted `{token}`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | Ready for QA | qa-fix | Fix applied in QA cycle 1; verification in the next gate |

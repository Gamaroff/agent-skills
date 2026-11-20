# Bug Report: Task 284 - The review-code citation describes a write the block does not make

**Task**: [Link](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Bug ID**: TASK-284-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 4, claim check of the cycle-3 fix, reproduced by reading the block)
**Date Found**: 2026-11-20

## Description

The cycle-3 fix for the PR review's coverage finding (PC-1) added a sentence to `skills/review-code/SKILL.md`
telling the reader to write `$PR_COMMENT_BODY_FILE` with the file tool in one call and post it in a later
one, citing `file-write-rules.md#fresh-body-post`. That block does not work that way. It creates the body
with `PR_COMMENT_BODY_FILE="$(mktemp -t review-code-comment.XXXXXX.md)"` and fills it in the same block
that posts it (lines 244-248), so the file is new on every run and a stale body cannot be posted. The
recipe exists for a body written by the file tool at a fixed path; applying it here instructs a change the
block does not need and contradicts its own code.

## Steps to Reproduce

1. Read `skills/review-code/SKILL.md` lines 238-258.
2. The `mktemp` write sits above the sentence that says to write the file with the file tool.

## Expected Behavior

`review-code` is recorded as an excluded site: its body is a fresh `mktemp` file built in the posting block,
so the recipe does not apply. The criterion allows exclusion with a reason in the QA report.

## Actual Behavior

The SKILL.md carries an instruction that does not match its block.

## Impact

A reader following the sentence would replace a safe `mktemp` write with a fixed-path file written in a
separate call, which is the exact risk the recipe guards against.

## Recommendation

Remove the sentence from `review-code/SKILL.md` (and the bundled `file-write-rules.md` copy that only that
citation pulled in), and list `review-code` as an exclusion with this reason in the QA report.

## Developer Fix Cycle

### Iteration 1

**Root cause**: the PC-1 fix cited the recipe at every site the PR review named without checking each
block's own write. `review-code` builds its body with `mktemp` in the posting block, so the recipe has
nothing to guard there.

**Fix**: removed the sentence from `skills/review-code/SKILL.md` (the file is now identical to `develop`)
and removed the bundled `file-write-rules.md` copy that only that citation pulled in (`git rm`; the bundler
never deletes). `review-code` is listed as an excluded site in the QA report with its reason.

**Probe**: `git grep` for "in one call and post it in a later one" over the executed documents. Population:
4 (`qa-fix`, `qa-story`, `qa-task`, `review-pr`). All four read the same on `develop`, so none was introduced
by this PR; they are `unaffected` here. `review-pr` Step 8 also builds its body with `mktemp` in the posting
block while its prose says to use the file tool, which is the same mismatch and is recorded as a follow-up
for the base, not fixed here.

**Verification for QA**: `git diff origin/develop -- skills/review-code/` is empty; `bundle --check` reports
0 problems; the LAN-server gate exit status is in the cycle's commit.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-20 | New | qa-task | Found in QA cycle 4 |
| 2026-11-20 | Ready for QA | qa-fix | Fix applied in QA cycle 4; verification in the next gate |
| 2026-11-20 | Closed | qa-task | Verified by task.284.qa.5.migrate-payload-heredocs-to-file-tool.md |

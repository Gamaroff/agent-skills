# Bug Report: Task 185 - the fake gh reads -X before --method, not the last one given

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: New
**Found By**: QA Engineer (QA cycle 6, safety re-probe, code review CR-1)
**Date Found**: 2026-10-05

## Description

`parseArgs` stores `-X` and `--method` under two keys. `runFakeGh` then reads the method with
`get("-X", "--method")`, which returns the last `-X` before it looks at `--method`. In pflag the two
spellings are one flag, and the last occurrence wins. So `gh api -X GET --method POST <path>` is a
POST to real `gh` and a GET to the fake.

## Steps to Reproduce

With a fixture serving `repos/eval/widgets/issues/12/comments`, call `runFakeGh`:

| argv | Result | Expected |
|---|---|---|
| `api -X GET --method POST <path>` | served, exit 0 | refused |
| `api -XGET --method=DELETE <path>` | served, exit 0 | refused |
| `api --method POST -X GET <path>` | served, exit 0 | served (the last one wins) |

## Expected Behavior

The method is the last value given across both spellings, and a non-GET method is refused.

## Actual Behavior

`-X` always outranks `--method`, so a write written with `--method` after `-X GET` is served as a
read and logged neither `refused` nor `unhandled`.

## Impact

Same as bug 5: latent in the review-pr suite, which serves no `api` fixture. Live for any scenario
that does.

## Recommendation

This is the third defect in a row in the fake's argv deny-list (glued flags, clusters, flag
aliases). See the escalation entry in the implementation report. The structural answer is to stop
deny-listing writes and allow-list reads: serve an `api` call only when no method, field or input
flag appears in any spelling, and refuse the rest.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-05 | New | qa-task | QA cycle 6 |

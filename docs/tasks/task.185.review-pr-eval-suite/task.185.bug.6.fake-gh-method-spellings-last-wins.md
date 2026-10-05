# Bug Report: Task 185 - the fake gh reads -X before --method, not the last one given

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-05

**Root Cause**: the fake decided writes by deny-list, which needs a complete copy of pflag. Three
consecutive spellings leaked (glued, clustered, `-X`/`--method` last-wins).

**Narrowing residue**: the `api` write check (repeat subject, third consecutive cycle; escalated)
**Move**: replace the mechanism. `api` is served by allow-list, and a deny-list is not patched again.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- `fake-gh.mjs`: an `api` call is served only when every flag is in `API_READ_FLAGS` and every
  method value given, in either spelling, is `GET`. Anything else is refused. An unknown flag, an
  unnamed cluster character or a non-GET method in any position now fails closed. Two real reads are
  refused by design: `--method POST -X GET` and `-X GET` with a field flag.
- `fake-gh.test.mjs`: allow-list test. Reads served: `--hostname`, `-p`, `--cache`,
  `-X GET --method get`, `-H … --paginate`. Refused: `-X GET --method POST`,
  `-XGET --method=DELETE`, `--method POST -X GET`, `--unknown-flag`, `-z`, `pr new`, `issue new`.
- `evals/shared/README.md`: the writes bullet states the allow-list and its two deliberate
  over-blocks.

**Testing**:

- `fake-gh.test.mjs` 11/11; `evals/shared` 601/601; `eval:review-pr` replay 4/4. The direct probe
  sets (31, 15 and 8 forms) are correct apart from the two deliberate over-blocks.
- Mutation-proven:
  - Flag allow-list removed: 4 tests fail (allow-list, cluster, glued, every-write), so covered.
  - Method read through `get()` precedence: the allow-list test fails, so covered.
  - The `new` alias removed: the allow-list test fails, so covered.

**Verification Steps for QA**:

1. `command node --test evals/shared/tests/fake-gh.test.mjs`
2. Serve an `api` path. Confirm `gh api -X GET --method POST <path>` is refused and
   `gh api --hostname github.com <path>` is served.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-05 | New | qa-task | QA cycle 6 |
| 2026-10-05 | Ready for QA | qa-fix | Fixed after escalation (user-approved allow-list) |
| 2026-10-05 | Closed | qa-task | QA cycle 7: 82 direct forms executed, no write served; reads served |

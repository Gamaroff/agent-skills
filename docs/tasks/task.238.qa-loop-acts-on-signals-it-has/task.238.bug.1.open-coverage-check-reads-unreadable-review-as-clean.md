# Bug Report: Task 238 - The open-coverage check reads an unreadable review as clean

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 1 diff review, CR-1)
**Date Found**: 2026-10-28

## Description

The `OPEN_COVERAGE` block in §5c Verdict branching
(`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1539`) prints `OPEN_COVERAGE=0` in three
different states:

- the review holds no open coverage finding (correct)
- `$REVIEW` names a missing or wrong path (`sed` writes its error to stderr, the pipe gets nothing)
- the report has no `## Machine-Readable Findings` block

The last two mean "could not look", yet they produce the same value as "found nothing". A `CONCERNS`
verdict whose review could not be read therefore takes the exit arm to Step 7. That is the gap this
task exists to close.

## Steps to Reproduce

1. Substitute a path that does not exist for `{the PR review report this cycle's 5c wrote}`.
2. Run the block. It prints `OPEN_COVERAGE=0` and exits 0.

## Expected Behavior

An unreadable report, or one without the findings block, is reported as such. For example it prints
`OPEN_COVERAGE=unreadable` or exits non-zero, and the verdict row treats it as a failed review (the
`Review failed` arm's HALT), never as an exit.

## Actual Behavior

It prints `OPEN_COVERAGE=0` and the run goes on to Step 7.

## Impact

The coverage route fails open on exactly the inputs nobody tested. `/finalise` would then halt on the
gap the route was added to catch.

## Recommendation

Before counting, check that `$REVIEW` is a readable file and contains both the
`## Machine-Readable Findings` heading and a `findings:` key. If either check fails, print a
distinct value and route it to the failed-review arm. Add the missing-path and no-block cases to
`pr-review-loop-parity.test.mjs`'s open-coverage fixtures.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The block piped `sed` straight into the counting `awk`. A missing file sends `sed`'s
error to stderr and nothing down the pipe; a report with no block, or a block without `findings:`,
also sends nothing that matches. In all three cases `awk`'s `END` prints `n + 0`, which is `0`.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- The block now reads the findings block into `BLOCK` only when `$REVIEW` is a readable file. It
  counts only when the block carries a top-level `findings:` key (`findings: []` included).
  Otherwise it prints `OPEN_COVERAGE=unreadable`.
- §5c routes `unreadable` to the **Review failed** arm (HALT), in the CONCERNS row, the Review
  failed row and the prose after the block.
- The resume contract gains a third CONCERNS row keyed on `unreadable`. It re-enters 5c once, as
  `review failed` does, so a fresh review report is written; it never goes to Step 7.

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the block, the two verdict rows and
  the routing prose
- `shared/resources/develop-pipeline-resume-contract.md`: the `unreadable` sub-state row
- `skills/develop-{task,story}/README.md`: the 5c sequence diagram's review-failed arm
- `evals/shared/tests/pr-review-loop-parity.test.mjs`: three `unreadable` cases (missing path, no
  block, heading without `findings:`), `findings: []` → 0, the routing assertion, and the resume
  table's third row. Each block now runs under bash and zsh

**Testing**: The 4 new tests were red on the old block. Mutating `unreadable` → `0` turned 3 red.
Restored, the parity suite reads 46/0.

**Verification Steps for QA**:

1. Run the §5c block with a non-existent `REVIEW` path. It should print `OPEN_COVERAGE=unreadable`.
2. Read the CONCERNS and Review failed rows. `unreadable` should reach HALT and never Step 7.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 1 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 1 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.2.qa-loop-acts-on-signals-it-has.md |

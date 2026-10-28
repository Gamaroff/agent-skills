# Bug Report: Task 238 - Open-coverage check prints an empty value when awk fails

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-18
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 9 diff review, CR9-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

The §5c open-coverage check (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551–1589`)
binds `OPEN_COVERAGE` from the output of an `awk` pipeline. When `awk` itself fails, the command
substitution is empty and the block prints `OPEN_COVERAGE=` at exit 0. A syntax error, a missing
binary, or an awk variant that rejects the program all cause this.

The routing prose reads three values: above zero, `unreadable`, and "otherwise". An empty value is
neither of the first two, so it takes the **Otherwise** arm and the loop exits to Step 7. The check
then gives the same answer when it could not look as when it found none. That is the class the
block's own comment rules out ("found none" and "could not look" must not print the same value).

## Steps to Reproduce

1. Put an `awk` stub that exits 2 first on `PATH`.
2. Run the open-coverage block against a report that holds one open coverage finding.

## Expected Behavior

`OPEN_COVERAGE=unreadable`.

## Actual Behavior

`OPEN_COVERAGE=` with exit 0. Reproduced by QA under bash, with the block extracted from the doc at
`51dc912e`.

## Impact

A `CONCERNS` review that holds an open coverage finding exits to Step 7 on a host where the awk
program does not run. `/finalise` then fails it after a full DoD pass. Exposure depends on the host's
awk, and no committed test runs the block under mawk or BWK awk (CR9-4, advisory).

## Recommendation

After the pipeline, map any value that is not all digits and not `unreadable` (empty included) to
`unreadable`. For example:
`case $OPEN_COVERAGE in unreadable|0|[1-9]|[1-9][0-9]*) ;; *) OPEN_COVERAGE=unreadable ;; esac`.
Add a fixture to `pr-review-loop-parity.test.mjs` that runs the block with a failing `awk` on `PATH`
and expects `unreadable`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The block trusted the awk pipeline's stdout. Only the `if` branch with no `findings:`
key assigned `unreadable` itself. An awk that printed nothing left an empty value, and the routing
prose has no arm for one.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: After the `if`/`else`, one shell-level guard maps anything that is not all
digits, the empty value included, to `unreadable`:
`case "$OPEN_COVERAGE" in ''|*[!0-9]*) OPEN_COVERAGE=unreadable ;; esac`. It covers every reader
failure, whatever the cause, so it does not depend on the awk program.

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the guard, plus one comment sentence
- `skills/develop-task/references/…`, `skills/develop-story/references/…`: bundled copies
- `evals/shared/tests/pr-review-loop-parity.test.mjs`: `openCoverageOf(body, env)`, and the test
  "an awk that fails → unreadable, never an empty value" (an awk stub that exits 2 on `PATH`)

**Testing**:

- The new test is red against `51dc912e`, the unfixed doc.
- Mutation: removing the guard turns exactly this test red.
- Parity suite 82/82.

**Verification Steps for QA**: Run the block with an awk stub that exits 2 first on `PATH`. Expect
`OPEN_COVERAGE=unreadable`.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 9 (`task.238.qa.9.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (QA cycle 9 fix) |
| 2026-10-28 | Ready for QA | qa-fix | Fixed in QA cycle 9 (see Developer Fix Cycle) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.10.qa-loop-acts-on-signals-it-has.md |

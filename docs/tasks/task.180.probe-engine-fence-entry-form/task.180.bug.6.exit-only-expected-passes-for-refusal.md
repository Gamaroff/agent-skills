# Bug Report: Task 180 - an exit-only `expected` lets a shell stop or an injected exit pass for a refusal

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: New
**Found By**: QA Engineer (QA cycle 4 safety re-probe, code review CR-1 / TASK-180-012)
**Date Found**: 2026-10-12

## Description

Cycle 3 made `expected` mandatory on a hostile `fence:` case. The gate accepts any `expected` that `expectedProblem` accepts, and that includes `{exit: 1}` alone. A shell that stopped on the input (`${x:?boom}`) or an injected `"; exit 1; "` also exits 1. So it matches the stated "refusal" and scores `rejected`. This is the defect the requirement was added to close, one level down.

## Steps to Reproduce

`runProbeSpec` against a block that is `X="<slot>"` then `exit 0`, an accept-all with no guard. Cases:

- hostile `${x:?boom}`, `expected: {exit: 1}`
- hostile `"; exit 1; "`, `expected: {exit: 1}`
- legitimate `ok`

## Expected Behavior

An accept-all block never reads `engages`. A hostile case whose `expected` cannot tell a refusal from a shell that stopped is declined by name. It is not scored.

## Actual Behavior

Verdict `engages`: both hostile cases are `rejected`. The same holds for `{exit: 1, stdout: ""}`, the shape the test suite's `ADMIT_CASES` uses.

## Impact

A false `engages` on a guard that does nothing. The same class as TASK-180-001, -005 and -009.

## Recommendation

For a hostile `fence:` case, require a non-empty `stdout` or `stderr` in `expected`; an exit code alone, or an empty output, is not a refusal. Decline exit-only cases by name. A silent guard is then honestly unprobeable rather than falsely `engages`. Add regression tests for the two inputs above.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New    | QA Engineer | QA cycle 4 — reproduced on 1a31af72 |

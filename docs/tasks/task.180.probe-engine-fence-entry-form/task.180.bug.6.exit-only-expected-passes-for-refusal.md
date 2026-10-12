# Bug Report: Task 180 - an exit-only `expected` lets a shell stop or an injected exit pass for a refusal

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-6
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
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

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-12 — qa-fix, QA cycle 4

**Root cause**: Cycle 3 required an `expected` on a hostile case but accepted any `expected` `expectedProblem` accepts. An exit code and an empty output are also what a stopped shell or an injected `exit` produce.

**Fix**: `runFenceCase` declines a hostile case whose `expected` has no non-blank `stdout` or `stderr` (`statesRefusalOutput`), by name: "states no refusal output". It is never scored. A guard that refuses silently is unprobeable through `fence:` by design. This is the user-chosen refinement of the cycle-3 model, not a new classifier: `scoreFenceRun` is unchanged except its step-4 comment.

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs` (the Admit and Refuse-everything fixture blocks now print `REFUSED`; `ADMIT_CASES` expects it); the rule restated in `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, qa-task / qa-story `SKILL.md`, `CHANGELOG.md`.

**Testing**: New test: an accept-all block with `${x:?boom}` and `"; exit 1; "` under `{exit: 1}`, `{exit: 1, stdout: ""}`, empty stdout+stderr, whitespace-only stderr and exit+absent — every hostile case declined, verdict never `engages`; with a non-empty refusal the same block reads `absent`. Mutation (decline removed) → red.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-10-12 | New          | QA Engineer | QA cycle 4 — reproduced on 1a31af72 |
| 2026-10-12 | Ready for QA | qa-fix      | Hostile `expected` must state a non-empty stdout or stderr; mutation-proven |

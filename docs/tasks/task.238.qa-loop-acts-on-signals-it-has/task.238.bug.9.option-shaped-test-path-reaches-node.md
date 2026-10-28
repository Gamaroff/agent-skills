# Bug Report: Task 238 - An option-shaped failing-test path reaches node as an option

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 4: probe `log-path-option-shaped`; reviewer CR-7)
**Date Found**: 2026-10-28

## Description

`shared/resources/fast-gate-outcome.sh:122` runs `node --test "${FILES[@]}"` at the base. `FILES`
comes from the gate log, with no `--` and no `./` prefix. The `^/` and `..` guards do not catch an
entry that starts with `-`, so a log line shaped `test at --opt=…:1:1` becomes a node option. With
`--import=<absolute head path>`, the base run would execute head code: the class DoD 1 fixed for
`..` paths.

## Steps to Reproduce

The engine reproduced it with probe `log-path-option-shaped` (`task.238.qa.4.security.run.json`).
The log names `test at --test-reporter=tap:1:1` and `test at t.test.mjs:3:1`.

Observed: the classifier runs `node --test --test-reporter=tap t.test.mjs` at the base and prints
`GATE_OUTCOME=pre-existing`.

## Expected Behavior

`BASE_CHECK=unavailable (a failing test file lies outside the checkout)`, then
`GATE_OUTCOME=attributable`.

## Actual Behavior

The entry is passed to node as an option, and the outcome is `pre-existing`.

## Impact

The gate log is the PR's own test output, and test stdout can write any line. A crafted line can
change what runs at the base.

## Recommendation

Return `unavailable` for any `FILES` entry that starts with `-`, or pass each entry as `./<path>`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The path guard refused absolute and `..` paths, but not one that starts with `-`.
Such a path reaches `node --test` as an option.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`): the path guard is one `grep -E` over
the failing files: `^/`, a `..` segment, or `^-`. Any match gives `attributable` ("a failing test
file lies outside the checkout") before any git call or base run.

**Testing**:

- **Red before**: the bug.9 test fails on `adff39e2`.
- **Green after**: it passes. It also asserts no `BASE_EXIT=` line, so the base never ran.
- **Mutation**: dropping `|^-` from the guard turned it red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 4 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 4 fix) |

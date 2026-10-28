# Bug Report: Task 238 - File load failures compare without their cause

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-14
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 6 diff review, CR6-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

When a test file fails to load, node reports it as one failing test: `test at x.test.mjs:1:1`, named
by the file path. `fast-gate-outcome.sh` keys that like any other failure (`x.test.mjs`, `1:1`,
`x.test.mjs`) and compares it with the base at `:246`. The key carries no cause. Any load failure at
the base therefore matches any load failure at the head, whatever made each one fail.

The `Cannot find module` / `ERR_MODULE_NOT_FOUND` guard catches one environment cause. An `ENOENT`
from a read at import time is another, and it passes the guard.

## Steps to Reproduce

On node 26.8.2, in a scratch repository with `local.json` gitignored:

1. On `develop`, `lib.mjs` reads `local.json` at import time
   (`JSON.parse(readFileSync(new URL("./local.json", import.meta.url), "utf8"))`). `x.test.mjs`
   imports `lib.mjs` and holds one passing test.
2. On a feature branch, create `local.json` (untracked) and commit `lib.mjs` as
   `export const v = ;`, a syntax error.
3. `node --test > g.log` exits 1 with `SyntaxError: Unexpected token ';'`.
4. `fast-gate-outcome.sh --log g.log --exit 1 --base develop`.

The base worktree has no `local.json`, so its run fails to load `x.test.mjs` with `ENOENT`.

## Expected Behavior

`GATE_OUTCOME=attributable`: the head's failure is a syntax error the base does not have.

## Actual Behavior

`GATE_OUTCOME=pre-existing (x.test.mjs;)`.

## Impact

A head-only load failure is committed and pushed as pre-existing. A syntax error breaks every test
in the file, and none of it is triaged. A base worktree commonly lacks gitignored local files, so the
precondition is ordinary.

## Recommendation

A file-level failure cannot be compared without its cause. When the head log names one (the name is
the file path, at `1:1`), return `unavailable`, which classes the gate attributable. This is the same
allow-list direction as gate 5's recommendation: accept only failures the comparison can read.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: the comparison matched a head failure to a base failure by position and name
alone. A file-level failure carries its cause only in the error text below it, which the comparison
never read.

**Third strike**: `fast-gate-outcome.sh` had HIGH findings in gates 4, 5 and 6. The owner chose to
delete the mechanism rather than patch it again.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`): the `pre-existing` outcome and the
whole base-worktree comparison are deleted. A file that fails to load reads attributable, like any
other red that is not "not measured".

**Testing**:

- **Red before**: "attributable: a test file that failed to load (bug.14)" reads `pre-existing`
  against a base whose file is red.
- **Green after**: it passes, and the base is never touched.
- **Mutations**: re-adding a base worktree, and printing `pre-existing` for a red, each turn it red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 6 (`task.238.qa.6.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started; third strike on `fast-gate-outcome.sh` |
| 2026-10-28 | Ready for QA | qa-fix | Fixed by deleting `pre-existing` (QA cycle 6 fix) |

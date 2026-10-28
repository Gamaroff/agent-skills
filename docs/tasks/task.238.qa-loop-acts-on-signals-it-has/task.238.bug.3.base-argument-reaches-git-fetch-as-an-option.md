# Bug Report: Task 238 - `--base` reaches `git fetch` as an option

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, by-hand probe of the operator-supplied argument)
**Date Found**: 2026-10-28

## Description

`shared/resources/fast-gate-outcome.sh:71` runs `git fetch -q origin "$BASE"`. `$BASE` is the
`--base` argument, which is the PR target branch (Q2's answer, or a `--target` flag). Git parses
options after the remote name, so a value that begins with `-` is read as an option, not a refspec.

## Steps to Reproduce

Run this in a scratch clone with a local `origin`:

```bash
git fetch -q origin "--upload-pack=touch $MARK; git-upload-pack"
```

The marker file is created. Probed 2026-10-28 in the QA scratchpad; the command ran.

## Expected Behavior

A base that cannot be a branch name is refused before any git call. Git branch names never start
with `-`. The script then falls back to `attributable`, the way it handles every other check it
cannot complete.

## Actual Behavior

The value is passed to `git fetch` as an option. With a local or ssh transport, `--upload-pack` runs
a command.

## Impact

The input is operator-supplied, so the exposure is limited. Still, the script's contract is to fail
closed on any check it cannot complete, and a mistyped or injected base currently runs code instead.

## Recommendation

Refuse a `--base` that begins with `-` or fails `git check-ref-format --branch`. Print
`BASE_CHECK=unavailable` and `GATE_OUTCOME=attributable`, or exit 2 as a usage error. Fetch with an
explicit refspec after `--`. Add the case to `qa-loop-fast-gate-outcomes.test.mjs`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: `$BASE` went into `git fetch -q origin "$BASE"` unchecked. Git parses options after
the remote name, so a value starting with `-` is read as an option.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- Before any git call, `fast-gate-outcome.sh` refuses a `--base` that starts with `-` or fails
  `git check-ref-format --branch`. It prints `BASE_CHECK=unavailable (--base is not a branch name: …)`
  and `GATE_OUTCOME=attributable`, falling closed like every other check it cannot complete. It does
  not exit 2, because callers act on the `GATE_OUTCOME` line, and a usage exit prints none.
- The fetch also takes `--` before the refspec, as defence in depth.

**Files Modified**:

- `shared/resources/fast-gate-outcome.sh`
- `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`: new test covering
  `--upload-pack=touch MARK; git-upload-pack`, `-develop` and `develop..x` against a fixture whose
  origin is a local path (where the injection fires). It asserts `attributable`, the reason, and
  that no marker was created.

**Testing**: Red on the old script, green after. The 44 existing tests are unchanged.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 1 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 1 fix) |

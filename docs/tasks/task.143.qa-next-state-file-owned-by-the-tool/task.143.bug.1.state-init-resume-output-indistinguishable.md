# Bug Report: Task 143 - `--state-init` resume output is indistinguishable from a fresh selection

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Bug ID**: TASK-143-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (Step 3b code review, CR-1 — verified)
**Date Found**: 2026-09-24

## Description

`--state-init` exits 0 in two different situations and prints two different shapes:

- **fresh selection**: the `--next`/`--item` payload (`id`, `what`, `entry`, `items`, `checklists`, and `stories[]` as objects);
- **resume** (a state file already exists; `--item` names the same item, or `--next` is used): the stored state view (`item`, `stories` as ids, `phase`, and no `what`, `items` or `checklists`).

SKILL.md Step 1 treats both as "the JSON it printed, identical to `--next`/`--item`", and it names exit 5 as the signal that "another run started in between". `--state-init --next` never exits 5, so that race produces exit 0 with the wrong shape.

## Steps to Reproduce

1. `uat-status.mjs --state-init --item D.2 --json` → payload (`"id": "D.2"`, `items`, `checklists` …).
2. `uat-status.mjs --state-init --next --json` → exit 0, prints `{"item":"D.2","phase":"selected",…}`; no `id`, no `items`.

## Expected Behavior

A caller can tell a fresh selection from a resume by exit code or shape, and Step 1 has a defined response to each.

## Actual Behavior

Both exit 0; Step 1's "continue with the JSON it printed" would read `items`/`checklists` from a state view that has neither.

## Impact

A `/loop /qa-next` iteration that races an in-flight run continues Step 2 with an undefined payload instead of halting `run-in-progress`.

## Recommendation

Give the resume branch its own exit code (or refuse `--state-init` whenever a state file exists, making Step 0's `--state-get` the only resume path), and document the response in Step 1.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-24

**Root Cause**: The review's design let `--state-init` double as a resume for the same item or for `--next`, on the same exit 0 as a fresh selection. Step 0 already owns resume through `--state-get`, so `--state-init` only sees an existing state in a race, and a race is a conflict whatever item it names.

**Fix Description**:
- `cmdStateInit` refuses any existing state with exit 5 `run-in-progress`, and prints and writes nothing. Exit 0 now means only "fresh selection, payload printed".
- The lock is created exclusively. `writeStateFile` writes a per-process temp file and moves it into place with `link()`, which fails on EEXIST, so the check and the create are one atomic step. This also closes CR-3.
- SKILL.md § Run state, Step 1 (exit 5 on either command) and the stop table; CHANGELOG; task Target Architecture and the success criterion.

**Files Modified**: `skills/qa-next/scripts/uat-status.mjs`, `skills/qa-next/SKILL.md`, `CHANGELOG.md`, `evals/qa-next/unit/uat-status.test.mjs`, task document.

**Testing**: "--state-init refuses ANY existing state …" (D.1, d.2, `--next` → 5, no payload, file unchanged); "the lock is created exclusively …" (`writeStateFile` direct); "eight concurrent --state-init calls: exactly one wins". Mutation-proved: printing the state on exit 0 → covered; `rename` instead of `link` → covered; no temp cleanup → covered; `--state-init` without `exclusive` → the concurrency test killed it in 5/5 runs, and the fix passed 5/5.

**Verification Steps for QA**: run `--state-init --item D.2`, then `--state-init --next` → exit 5, empty stdout.

## Status History

| Date       | Status       | Changed By | Notes                  |
| ---------- | ------------ | ---------- | ---------------------- |
| 2026-09-24 | New          | qa-task    | QA cycle 1             |
| 2026-09-24 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 1 |

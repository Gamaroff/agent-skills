# Bug Report: Task 239 - The Convergence check's lock-restore sentence promises a repair `--restore` does not make

**Task**: [Link](./task.239.qa-escalation-and-grant-say-what-runs.md)
**Bug ID**: TASK-239-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-10-28

## Description

QA cycle 1's fix for CR-4 added this to Convergence check step 3 in
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`: "A lock the jq cannot read is restored
first, with `advance-pipeline-lock.sh --restore {work-item-dir}`, and the field is read again."

`restore_lock` in `shared/resources/advance-pipeline-lock.sh` does not do that. While the lock
file exists it exits 0 with "lock present — nothing to restore", and it never checks whether the
contents parse. A lock that is present but empty, corrupt or not an object is left as it is, and
the second read fails exactly like the first. A missing lock with no snapshot makes `--restore`
exit 1. In both cases the sentence has already forbidden the default of `1`, and it gives no next
step. The Convergence check is left with nothing it is allowed to do.

The citation also departs from the other sites:

- It is a bare script name, not the bundled `.agents/skills/{…}/references/` path.
- It uses a new placeholder, `{work-item-dir}`, where the resume contract uses `{doc-directory}`.

## Steps to Reproduce

1. Leave `.claude/state/develop-pipeline.lock` present but holding invalid JSON.
2. Follow step 3: `jq -r '.convergence_from_cycle // 1'` fails, so run `--restore` as instructed.
3. `--restore` prints "lock present — nothing to restore" and exits 0. The re-read fails again.

## Expected Behavior

The sentence names the actual path for each failure, and every failure ends in a defined action:

- A missing lock is restored through the resume contract's restore step.
- A present but unparseable lock, or a failed restore, halts loudly with the tool's stderr.

## Actual Behavior

The sentence promises a repair that `--restore` does not make, so an agent following it has no
legal next step.

## Impact

A pipeline with a damaged lock reaches a Convergence check that can neither read the field nor
default it. An agent left without a rule is the case where it improvises.

## Recommendation

- Split the two cases. A missing lock: restore through **Restore the lock (both resume paths)** in
  the resume contract, cited, not restated. A present but unparseable lock, or a `--restore` that
  exits non-zero: HALT with the jq or `--restore` stderr.
- Keep "never default to 1" for both cases.
- If a command is shown, use the bundled path with `{doc-directory}`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The cycle-1 fix restated what `--restore` does instead of citing the one place that
defines it, and restated it wrongly. `restore_lock` puts back a missing lock; it never repairs a
present one.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-28

**Fix Description** (qa-fix Step 2.6 move: **consolidate**, prompted by the narrowing-residue offer
on the step-5-6 doc). When the jq fails, the Convergence check HALTs with its stderr and does not
run the trip. A missing lock is put back by the resume contract's **Restore the lock (both resume
paths)**, which is cited, not restated. The sentence says that step does not repair a present but
unparseable lock. "Never default to 1" is kept. The bare script name and the `{work-item-dir}`
placeholder are gone (QA2-CR-7 cleanup).

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: Convergence check step 3

**Testing**: none added. The sentence is a HALT instruction with no engine behind it. The probe
confirms no other site says the lock is "restored first".

**Verification Steps for QA**:

1. Read step 3 against `restore_lock` in `shared/resources/advance-pipeline-lock.sh`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | New | QA Engineer | QA cycle 2 refute pass. Code-review finding CR-1, confirmed by reading `restore_lock` in `advance-pipeline-lock.sh` |
| 2026-10-28 | In Progress | qa-fix | Investigation, QA cycle 2 |
| 2026-10-28 | Ready for QA | qa-fix | Consolidated: HALT plus a citation of the resume contract's restore step |

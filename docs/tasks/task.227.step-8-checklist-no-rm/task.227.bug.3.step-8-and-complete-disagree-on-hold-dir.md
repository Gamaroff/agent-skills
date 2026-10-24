# Bug Report: Task 227 - Step 8 and `--complete` disagree about an unlistable hold directory

**Task**: [Link](./task.227.step-8-checklist-no-rm.md)
**Bug ID**: TASK-227-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3; diff review CR-1, reproduced by QA)
**Date Found**: 2026-10-24

## Description

Two places now decide whether Step 4's hold directory still holds files:

- The Step 8 Completion Checklist (`develop-pipeline-step-8-commit.md:276`) HALTs when `ls -A` on the directory prints something. Stderr is discarded, so a directory it cannot list reads as empty and the check passes.
- `advance-pipeline-lock.sh --complete` (`:190`, since QA cycle 2) keeps both hold records when `ls -A` fails or prints something.

On an unlistable directory the two disagree. Step 8 lets the run finish, and `--complete` then keeps the records and warns on stderr. The comments in Step 8 (`:288`) and in the script header say Step 8 has already refused every case where `--complete` keeps the records. That is no longer true.

## Expected Behavior

Step 8 refuses to finish in every case where `--complete` would keep the hold records, because both read one rule.

## Actual Behavior

Reproduced with a hold directory holding `held.txt`, made unlistable with `chmod 000`, and the record pointing at it:

```text
Step 8 check (line 276 form): passes
advance-pipeline-lock.sh --complete: "kept …/step4-hold-dir.txt and step4-held-paths.txt — … cannot be listed"
```

## Impact

A pipeline run can print `✅ Step 8 post-conditions verified` while files Step 4 moved aside may still be in `/tmp`. The records survive, so nothing is lost yet, but the run reports itself finished, which is the outcome the Step 8 check exists to prevent (task.147 QA-3, CR-3). The trigger needs a hold directory its own creator cannot list. That is unlikely, but cycle 2 made it reachable.

## Recommendation

1. Give `advance-pipeline-lock.sh` a read-only mode that prints `clear` or `pending: …` for the hold records, and make `--complete` use it.
2. Have the Step 8 check call that mode and HALT on anything other than `clear`.
3. Add an unlistable-directory case to the Step 8 fixtures, and per-mode cases to scenario 15.
4. Cover QA3-2 in the same rule: a record that exists but cannot be read is `pending`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-24

**Root Cause**: The rule "the hold records still point at held files" lived in two places, each written as its own `ls -A` test. Cycle 2 tightened one copy, in `--complete`, and left the other, in Step 8. Each looked right on its own, and no test compared them.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- `advance-pipeline-lock.sh` states the rule once, as `hold_state`. It reads `pending` when the named directory holds files, cannot be listed or is not a directory, or when the record exists but cannot be read (QA3-2). It reads `clear` when the record is absent or empty, or names a path that is gone.
- A new read-only mode, `--hold-state`, prints that answer. `--complete` keeps both hold records by it.
- Step 8's held-files check calls `--hold-state` and HALTs on anything other than `clear`, so it refuses every state in which `--complete` would keep the records. It no longer has its own copy of the rule.

**Files Modified**:

- `shared/resources/advance-pipeline-lock.sh` (and its bundled copies)
- `shared/resources/advance-pipeline-lock.test.sh`
- `shared/resources/develop-pipeline-step-8-commit.md` (and its bundled copies)
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `CHANGELOG.md`, the task document

**Testing**:

- Scenario 15 has six hold cases per arm (full, unlistable, unreadable, not a directory, empty, missing), and each asserts both `--hold-state` and `--complete`. Two more cases cover no record and a usage error. 102/102.
- Step 8 fixtures: an unlistable hold dir and an unreadable record each fail Step 8 and keep both records. 64/64.
- Mutations, each restored and checked with `cmp`:
  - Step 8 back on its own `ls -A` copy → both new Step 8 cases fail.
  - An unreadable record reads `clear` → the unreadable cases fail in both suites.
  - An unlistable dir reads `clear` → the unlistable cases fail in both suites.
  - Step 8 ignores the answer → three Step 8 cases fail.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-24 | New | qa-task | Found by task.227.qa.3.step-8-checklist-no-rm.md |
| 2026-10-24 | In Progress | qa-fix | Investigation started (QA cycle 3 fix) |
| 2026-10-24 | Ready for QA | qa-fix | Fix implemented; mutation-proven |

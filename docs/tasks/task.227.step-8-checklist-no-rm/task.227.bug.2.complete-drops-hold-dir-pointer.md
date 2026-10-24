# Bug Report: Task 227 - `--complete` removes the hold-dir record while held files are still held

**Task**: [Link](./task.227.step-8-checklist-no-rm.md)
**Bug ID**: TASK-227-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 1; diff review CR-1, reproduced by QA)
**Date Found**: 2026-10-24

## Description

`advance-pipeline-lock.sh --complete` now removes `step4-hold-dir.txt` in both arms, with no condition. That record is the only pointer to the directory where Step 4's Pre-flight Guard moved out-of-scope untracked files (`/tmp/pipeline-hold-XXXXXX`). Restore Held Files deletes the record once it has restored them. The Step 8 Completion Checklist refuses to run `--complete` while the record names a non-empty directory. A `--complete` run anywhere else is not checked.

Before this task, the no-lock arm of `--complete` removed nothing. The task's Breaking Changes section says "No caller sees a different end state". That is not true for this record.

## Expected Behavior

`--complete` keeps `step4-hold-dir.txt` when the directory it names exists and is not empty, and says so on stderr. It removes the record in every other case, as it does now.

## Actual Behavior

Reproduced against the committed script (no lock; a hold directory holding `held.txt`; the record pointing at it):

```text
PIPELINE_LOCK=$D/develop-pipeline.lock bash shared/resources/advance-pipeline-lock.sh --complete
rc=0, record: (gone) — held.txt still in the hold directory
```

## Impact

Consider a run that HALTs after the Pre-flight Guard and before Restore Held Files, for example on a failed `/create-pr`. If someone then runs `--complete` by hand to clear the state, the run loses its only record of where the held files are. The files stay in `/tmp` with nothing pointing to them, and `/tmp` is cleared on reboot.

## Recommendation

1. Inside `--complete`, test the record the way Step 8's check does: when it names a directory that exists and is not empty, keep the record and print a single warning on stderr that names the directory.
2. Add scenario 15 cases for both arms: a non-empty hold directory keeps the record and warns; an empty or missing one removes it.
3. The existing no-lock test that asserts no stderr must stay green, because its fixture holds no hold record.
4. Correct the Breaking Changes and CHANGELOG wording if the behaviour they describe changes.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-24

**Root Cause**: `--complete` removed `step4-hold-dir.txt` unconditionally with the other four records. Step 8 refuses to reach `--complete` while that record names a non-empty directory, but a hand-run `--complete` had no such check.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- `--complete` removes the other four records as before. It removes `step4-hold-dir.txt` only when the directory it names is missing or empty. Otherwise it keeps the record and prints one stderr line naming the directory and the Restore Held Files block. The check runs above the no-lock exit, so both arms behave the same.
- Script header, usage text, the Step 8 comments around `--complete`, the task's Breaking Changes section and the CHANGELOG entry now state the exception.

**Files Modified**:

- `shared/resources/advance-pipeline-lock.sh` (and its 12 bundled copies)
- `shared/resources/advance-pipeline-lock.test.sh`
- `shared/resources/develop-pipeline-step-8-commit.md` (and its 3 bundled copies)
- `CHANGELOG.md`, `task.227.step-8-checklist-no-rm.md` §5

**Testing**:

- Scenario 15 gains three hold-dir cases per arm: full (record kept, held file kept, stderr names the directory), empty and missing (record removed, no stderr). 82/82 pass under bash; zsh is not installed here.
- Mutation: the keep branch disabled → both "keeps a live hold-dir record" cases fail (80/82); restored (`cmp`).

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-24 | New | qa-task | Found by task.227.qa.1.step-8-checklist-no-rm.md |
| 2026-10-24 | In Progress | qa-fix | Investigation started (QA cycle 1 fix) |
| 2026-10-24 | Ready for QA | qa-fix | Fix implemented; mutation-proven |

# Bug Report: Task 143 - The pre-upgrade `executed` resume treats any same-named run file as its own

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Bug ID**: TASK-143-BUG-6
**Severity**: MEDIUM
**Priority**: P3
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 6 code review CR-1 and CR-2, medium/medium; CR-1 reproduced against the tool)
**Date Found**: 2026-09-24

## Description

Cycle 5's fix for TASK-143-BUG-5 changed the resume map (`skills/qa-next/SKILL.md:88`). A pre-upgrade run resumed at `executed` with `runFile: null` now records `runs/<item>/<local start date>-<envLabel>.md` as `runFile` whenever that file exists. The map then states: "Either way `priorRuns` stays exact."

That is false, because two distinguishable states lead to the same check:

1. **The file belongs to an earlier run (CR-1).** v0.51.0 set `phase: executed` at the end of Step 3 and wrote the run file at Step 4.1. A run cut off between those two points has written nothing. Suppose an earlier completed run of the same item, on the same day and under the same env label, left a file with that name. This happens when the owner resets the row to ⬜ and it is re-tested that day. The resume map then records the earlier run's file as this run's `runFile`. Two things follow. `priorRuns` drops the earlier run and no longer carries the `unverifiable` flag. Step 4 then overwrites the earlier run's file, including its Findings rows, and the registry's `Last run` link for that earlier verdict now points at different content.
2. **The file is named for the wrong date (CR-2).** v0.51.0 named the file with the date on which Step 4 wrote it, not the run's start date. For a run that crossed midnight, or a v0.51.0 resume on a later day, the start-date guess misses. `--run-path` then hands out a fresh name beside the half-written file, and recording it clears the `unverifiable` flag that exists for this very guess (`stateView`: `!state.runFile && executed`). The result is a wrong `priorRuns` reported as exact.

## Steps to Reproduce

1. Registry with row D.1. Create `docs/qa/runs/D.1/2026-09-24-lan.md`, standing in for an earlier completed run.
2. Write a v0.51.0-shape state file: `{ "item": "D.1", "runFile": null, "phase": "executed", "startedAt": "2026-09-24T12:00:00Z" }`.
3. `--state-get --json` returns `priorRuns: []` and `unverifiable: ["priorRuns"]`. The flag is honest.
4. Follow the resume map: the file exists, so run `--state-set runFile runs/D.1/2026-09-24-lan.md`.
5. `--state-get --json` returns `priorRuns: []` and no `unverifiable`. The earlier run has disappeared, and the answer is presented as exact.

With `--run-path` instead, the same case returns `runs/D.1/2026-09-24-lan-02.md` and the exact `priorRuns: ["runs/D.1/2026-09-24-lan.md"]`.

## Expected Behavior

A pre-upgrade resume never claims an exact `priorRuns` on evidence it cannot verify. It never overwrites a run file that it cannot show is its own.

## Actual Behavior

The existence of a file named `<local start date>-<envLabel>.md` is taken as proof that this run wrote it. The resulting `priorRuns` is reported as exact.

## Impact

The case is narrow: a v0.51.0 run interrupted between `phase: executed` and the end of Step 4 and then resumed after the upgrade, which is the same migration path as bugs 2 to 5. When it happens, an earlier committed run's record is overwritten (recoverable from git), and `priorRuns` is misreported with no flag.

## Recommendation

Stop deciding ownership in prose. The tool cannot tell which file v0.51.0 wrote, so do not claim exactness for a legacy run. Keep `priorRuns` flagged `unverifiable` for any state file that lacked `runFile` when it was read, even after a `runFile` is recorded. Or move the decision into a tool command that states its uncertainty. Either way, make the resume map call `--run-path`, which never hands out a taken name and so never overwrites another run, and delete the "Either way `priorRuns` stays exact" sentence. Make the test prove the chosen behaviour on any day (see TASK-143-QA6-1).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-24

**Root Cause**: The fixes for bugs 2 to 5 each added a more precise rule for identifying which file v0.51.0 wrote for this run. v0.51.0 recorded nothing that could answer that. Bug 5's rule took a file's name as proof of ownership, and with one `runFile` recorded, `stateView` stopped flagging the answer. Two disk states that look the same (a half-written own file, or an earlier same-day run) got one confident answer.

**Proposed Fix**: Stop claiming exactness the evidence cannot support, rather than adding a seventh rule.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-24

**Fix Description**:

- `stateView` (`uat-status.mjs`): for a legacy state read at `executed` or later, `priorRuns` is always named in `unverifiable`, and the date-name exclusion always applies, **whether or not a `runFile` has since been recorded**. The recorded `runFile` is still excluded. Before `executed` nothing changes: the answer is exact.
- SKILL.md resume map: a pre-upgrade `executed` resume always calls `--run-path` and records the fresh path. It never reuses an existing file, because `--run-path` never hands out a taken name, so no earlier run can be overwritten. The claim "Either way `priorRuns` stays exact" is deleted. The report says a half-written older file may sit beside this run's file.
- CHANGELOG and the task's `--state-get` design text now say the same thing.

**Trade-off, stated**: when the existing file really was this run's half-written file (bug 5's case), it now stays beside the new one as a stray. That is flagged and recoverable. The alternative was silently overwriting another run's committed record, which is neither.

**Files Modified**: `skills/qa-next/scripts/uat-status.mjs`, `skills/qa-next/SKILL.md`, `CHANGELOG.md`, `evals/qa-next/unit/uat-status.test.mjs`, the task document (design text).

**Testing**: The QA4-1 test was rewritten: after recording a fresh `runFile`, `priorRuns` is still flagged. A new test covers both disk states at once. It uses fixtures dated from the UTC `today()` that `--run-path` uses (closing TASK-143-QA6-1), and asserts that `--run-path` hands out `<today>-lan-02.md`, that the existing file's bytes are unchanged, and that the answer is flagged. Mutation: restoring `!state.runFile && executed` turns both tests red (60/62). Suite 62/62 under the local TZ, `TMPDIR=/tmp`, and Pacific/Kiritimati, Pacific/Pago_Pago and Asia/Tokyo.

## Status History

| Date       | Status | Changed By | Notes      |
| ---------- | ------ | ---------- | ---------- |
| 2026-09-24 | New    | qa-task    | QA cycle 6 |
| 2026-09-24 | Ready for QA | qa-fix | Fixed in qa-fix cycle 6 |

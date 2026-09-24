# Bug Report: Task 143 - The `executed` resume step ignores a run file an interrupted Step 4 already wrote

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Bug ID**: TASK-143-BUG-5
**Severity**: MEDIUM
**Priority**: P3
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 5 code review, CR-1 — verified against `v0.51.0:skills/qa-next/SKILL.md` Step 4.1 and the phase write at the end of Step 4)
**Date Found**: 2026-09-24

## Description

The cycle-4 resume instruction has a pre-upgrade run resumed at `executed` with `runFile: null` call `--run-path`, then `--state-set runFile`. v0.51.0 wrote `runs/<id>/<date>-<env>.md` in Step 4.1 but set `phase: recorded` only at the end of Step 4. A run interrupted part-way through Step 4 has therefore already written its file. `--run-path` returns the next free name (`-02`), `runFile` points at it, and the half-written file from the interrupted Step 4 is listed in `priorRuns` **without** an `unverifiable` flag. Step 4 then writes a second file for the same run, and `--findings` counts that run's findings twice.

## Expected Behavior

If the older release's own file already exists (named by the run's local start date and the env label), the resume records **that** file as `runFile` and Step 4 overwrites it. `--run-path` is called only when no such file exists.

## Impact

Narrow: only a v0.51.0 run interrupted inside Step 4 and resumed after the upgrade. When it happens, one run gets two run files and its findings are double-counted.

## Recommendation

Change the resume instruction to: if `runs/<id>/<local start date>-<envLabel>.md` exists, `--state-set runFile` to it; otherwise `--run-path`, then `--state-set runFile`. Fix the comment and CHANGELOG claims to match. Add a test in which the own file exists before `runFile` is set.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-24

**Root Cause**: The cycle-4 instruction assumed an `executed` resume had written nothing. v0.51.0 wrote its run file at Step 4.1, before the phase moved.

**Fix Description**: SKILL.md's resume map now has a pre-upgrade `executed` resume check for `runs/<item>/<local start date>-<envLabel>.md` first. If it exists, `--state-set runFile` to it, and Step 4 rewrites it. Otherwise `--run-path`, then `--state-set runFile`. The `stateView` comment and the CHANGELOG say the same.

**Files Modified**: `skills/qa-next/SKILL.md`, `skills/qa-next/scripts/uat-status.mjs` (comment only), `CHANGELOG.md`, `evals/qa-next/unit/uat-status.test.mjs`.

**Testing**: "a pre-upgrade run interrupted INSIDE Step 4 reuses the file it already wrote" shows that `--run-path` hands out a different name, and that recording the existing file gives an exact, unflagged `priorRuns`. The resume-map sentence itself is prose. The test holds the tool behaviour it relies on.

## Status History

| Date       | Status       | Changed By | Notes                   |
| ---------- | ------------ | ---------- | ----------------------- |
| 2026-09-24 | New          | qa-task    | QA cycle 5              |
| 2026-09-24 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 5 |

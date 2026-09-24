# Bug Report: Task 143 - Legacy `priorRuns` derivation counts the run's own file when `runFile` is null

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Bug ID**: TASK-143-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (Step 3b code review, CR-2 — verified against `v0.51.0:skills/qa-next/SKILL.md`)
**Date Found**: 2026-09-24

## Description

`stateView` derives a legacy file's `priorRuns` as the row's `priorRuns` minus `state.runFile`. The v0.51.0 SKILL.md never instructs the skill to write `runFile` (it appears only in the example object as `"<path or null>"`; Step 4 writes `runs/<id>/<date>-<env>.md` without recording it), so a real v0.51.0 state file resumed at `recorded` or `committed` has `runFile: null` and the run's own file — already written in Step 4 — is counted as a prior run. The run is then reported (Step 6) and committed (Step 5) as a re-run: the exact outcome the derivation exists to prevent. The committed test passes only because it injects `runFile` in the registry-relative form.

## Steps to Reproduce

1. State file in the v0.51.0 shape with `"runFile": null, "phase": "recorded"`, for a row whose `Last run` links a run file written by this run.
2. `uat-status.mjs --state-get --json` → `priorRuns` includes this run's own file.

## Expected Behavior

A derived `priorRuns` never includes the run the state file describes.

## Actual Behavior

It includes it whenever `runFile` is null (every real v0.51.0 file).

## Impact

Mis-numbered run file header and a `re-run` commit subject on the first run after an upgrade.

## Recommendation

When `runFile` is null and the phase is `recorded` or later, also exclude the row's current `Last run` target (the file Step 4.4 just linked); add a test with `runFile: null`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-24

**Root Cause**: The derivation identified "this run's own file" only by `state.runFile`, which v0.51.0 never recorded.

**Fix Description**: When `runFile` is null, `stateView` also excludes (a) the row's `Last run` target once the phase is `recorded` or later (Step 4.4 linked it), and (b) any run file whose mtime is at or after `startedAt` (Step 4 wrote it, including a resume in the middle of Step 4). Each exclusion is tested alone.

**Files Modified**: `skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs`, `CHANGELOG.md`, task document.

**Testing**: "a real v0.51.0 file has runFile null …" covers the `executed` case (time only), the `recorded` case, and the `committed` case with no `startedAt` (`Last run` only). The earlier run's file has its mtime set in the past. Mutation-proved: dropping the `Last run` exclusion → covered; dropping the mtime exclusion → covered.

**Verification Steps for QA**: seed a v0.51.0-shape file with `"runFile": null` at `recorded`, then `--state-get --json` → `priorRuns` excludes the run's own file.

## Status History

| Date       | Status       | Changed By | Notes                  |
| ---------- | ------------ | ---------- | ---------------------- |
| 2026-09-24 | New          | qa-task    | QA cycle 1             |
| 2026-09-24 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 1 |
| 2026-09-24 | Ready for QA | qa-fix     | Cycle 2: the cycle-1 heuristics were replaced by the file-name date rule (TASK-143-BUG-3) |

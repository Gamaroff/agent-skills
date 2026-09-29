# Bug Report: Task 143 - Cycle-1 legacy `priorRuns` exclusions misfire on early exits and refreshed mtimes

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Bug ID**: TASK-143-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR-2 + CR-3 — verified against `v0.51.0:skills/qa-next/SKILL.md`)
**Date Found**: 2026-09-24

## Description

The fix for TASK-143-BUG-2 finds a legacy run's own file by two heuristics, and each one misfires:

1. **`Last run` from `recorded` on.** v0.51.0's Step 2 early exits (`--set <id> na --note …` and `--set <id> blocked --note …`) pass no `--run`, so `Last run` still names the *previous* run. The derivation drops that run from `priorRuns`, and a re-run is reported and committed as a first run, or with the wrong previous-run link. `blocked` is a common UAT outcome.
2. **mtime ≥ `startedAt`.** v0.51.0 had the agent write `startedAt` by hand, and Step 0's checkout or fast-forward can refresh earlier run files' mtimes. Either one drops real earlier runs or keeps this run's own file. `derived` reports every outcome the same way.

## Expected Behavior

This run's own file is identified deterministically. v0.51.0 wrote exactly one file per date and env label, `runs/<id>/<date>-<envLabel>.md`, with no sequence suffix, so the file whose name carries this run's date *is* this run's file. When that cannot be established (no usable `startedAt`), the value is marked as unverifiable rather than silently derived.

## Actual Behavior

Heuristics that depend on the verdict path and on filesystem timestamps.

## Impact

A mis-numbered run header and a wrong `re-run` / first-run commit subject on the first run after an upgrade.

## Recommendation

Replace both heuristics with a filename-date rule: exclude run files whose `<date>` prefix is on or after the run's start date. Mark `priorRuns` as `unverifiable` when `startedAt` does not parse. Test the `na`/`blocked` early exit and a refreshed mtime.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-24

**Root Cause**: Cycle 1 identified the own file by signals that depend on the verdict path (`Last run`) and on the filesystem (mtime), and neither is a property of the file.

**Fix Description**: `stateView` identifies a legacy run's own file by the date in its name. v0.51.0 wrote one `runs/<id>/<date>-<env>.md` per date with no sequence suffix, so a file dated on or after the start date (the earlier of the UTC and local calendar dates of `startedAt`) is this run's. An unparseable `startedAt` names `priorRuns` in a new `unverifiable` list instead of guessing. The row and the run history are now read once per legacy read (CR-6).

**Files Modified**: `skills/qa-next/scripts/uat-status.mjs`, `skills/qa-next/SKILL.md`, `CHANGELOG.md`, `evals/qa-next/unit/uat-status.test.mjs`, task document.

**Testing**: The rewritten "a real v0.51.0 file has runFile null …" test covers a `na`/`blocked` early exit (the previous run is kept), an earlier run whose mtime is now (kept), the own file at `executed` and at `recorded` (excluded), and an unparseable `startedAt` (`unverifiable`). "a legacy run started near midnight …" runs under `TZ=America/New_York`. Mutation-proved: dropping the date exclusion, `>=` → `>`, dropping `unverifiable`, and UTC-only start date → all covered.

## Status History

| Date       | Status       | Changed By | Notes                   |
| ---------- | ------------ | ---------- | ----------------------- |
| 2026-09-24 | New          | qa-task    | QA cycle 2 (refute)     |
| 2026-09-24 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 2 |

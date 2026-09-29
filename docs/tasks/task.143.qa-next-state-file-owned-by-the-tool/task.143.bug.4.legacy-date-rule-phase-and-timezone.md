# Bug Report: Task 143 - Legacy file-name date rule ignores the phase and the timezone

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Bug ID**: TASK-143-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3 code review, CR-1 + CR-2 + CR-3 — verified)
**Date Found**: 2026-09-24

## Description

The cycle-2 rule excludes from a legacy (`runFile: null`) file's derived `priorRuns` every run file dated on or after the earlier of the UTC and local start dates. It is wrong in three ways:

1. **Phase (CR-1).** At `selected`/`resolved` (and at `executed` before Step 4 writes anything) this run has written **no** file, so a same-day file is a genuine prior run. It is dropped. The resumed run's `--run-path` then writes `<date>-<env>-02.md` beside it, and the run is recorded as the 1st run.
2. **Timezone (CR-2).** v0.51.0 named files by the **local** date. Taking the earlier of the UTC and local dates is too early east of UTC. Under `TZ=Asia/Tokyo` with `startedAt 2026-09-23T20:00:00Z` (local date the 24th), a genuine prior `2026-09-23-lan.md` is excluded.
3. **Env label (CR-3).** v0.51.0 wrote one file per date **and env label**, so a same-day run under another label is also dropped. The tool cannot know the configured label.

## Expected Behavior

Where the answer is exact, it is exact. Before `executed` this run has written nothing, so the history is the pre-run history. Where it cannot be exact (`executed` or later with `runFile: null`), the value is a stated best effort and flagged `unverifiable`, so the report says so.

## Recommendation

Apply no exclusion before `executed`. From `executed` on, exclude only files named by the **local** start date, and always name `priorRuns` in `unverifiable`. Test both phases and a UTC+ timezone.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-24

**Root Cause**: The rule claimed an exactness the v0.51.0 record cannot support, and applied it at phases where no own file can exist yet.

**Fix Description**: `stateView` applies no exclusion before `executed`, where the answer is exact. From `executed` on with `runFile: null`, it excludes only files named on or after the **local** start date (`localDate`, replacing the earlier-of-UTC/local `startDate`), and always names `priorRuns` in `unverifiable`. SKILL.md, CHANGELOG and the task's Target Architecture say what `unverifiable` means. The duplicated comment in `runPathFor` is removed (CR-4).

**Files Modified**: `skills/qa-next/scripts/uat-status.mjs`, `skills/qa-next/SKILL.md`, `CHANGELOG.md`, `evals/qa-next/unit/uat-status.test.mjs`, task document.

**Testing**: The legacy `runFile: null` test adds `selected`/`resolved` with a same-day prior file (kept, not flagged) and asserts `unverifiable` from `executed` on. A new `TZ=Asia/Tokyo` mirror keeps the previous-local-day run. Mutation-proved: dropping the phase guard, dropping the always-flag, UTC in place of the local date, and dropping the date exclusion. All covered.

## Status History

| Date       | Status       | Changed By | Notes                   |
| ---------- | ------------ | ---------- | ----------------------- |
| 2026-09-24 | New          | qa-task    | QA cycle 3              |
| 2026-09-24 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 3 |

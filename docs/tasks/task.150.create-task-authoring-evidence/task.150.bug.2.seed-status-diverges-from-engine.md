# Bug Report: Task 150 - seedFromObservations reads status differently from the engine

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Bug ID**: TASK-150-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, security probe)
**Date Found**: 2026-09-28

## Description

`seedFromObservations` computes an entry's status as `String(frontmatter.status || "open")` and
refuses anything that is not exactly `open`. The observation-log engine's `statusOf`
(`shared/resources/observation-log.js`) trims the value and reads an empty status as `open`. The
two disagree on a padded status: the engine calls `" open "` open, and the seed refuses it as
"already has a home". A second definition of "what status is this entry" is the enumeration class
in `docs/reference/anti-patterns.md`.

## Steps to Reproduce

Probe run (`task.150.qa.1.security.run.json`, control `seedAcceptsStatus`): 8 cases, verdict
`engages`, and the one legitimate case `st.open-ws` (`" open "`) was **over-blocked**.

## Expected Behavior

The seed reads status with the engine's own `statusOf`, so the two can never disagree.

## Actual Behavior

An entry the engine lists as open is refused by `--from-observation`.

## Impact

The entry is refused with a message that says it is not open, when the log says it is. The failure
direction is safe (nothing is parked wrongly), but the refusal names the wrong reason.

## Recommendation

Import `statusOf` from `../references/observation-log.js` (already bundled into create-task) and
use it in place of the local expression. Add `" open "` and `""` as accepted cases in
`from-observation.test.js`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-28

**Root Cause**: the seed re-derived an entry's status instead of asking the engine.

**Fix Description**: `lib.js` imports `statusOf` from `../references/observation-log.js`, the engine
already bundled into create-task, and uses it. There is now one reader of an entry's status.

**Files Modified**:

- `skills/create-task/scripts/lib.js`
- `skills/create-task/tests/from-observation.test.js`: `" open "`, `""` and `null`. Each case
  first asserts the engine's own `statusOf` reads the status as `open`, then that the seed accepts it

**Testing**: red when the old expression is restored, green on the fix.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ---------------------------- |
| 2026-09-28 | New | QA | Probe over-block `st.open-ws` |
| 2026-09-28 | Ready for QA | qa-fix | Reuse the engine's `statusOf` |
| 2026-09-28 | Closed | QA | Cycle 2 re-probe: status control engages 7/7 |

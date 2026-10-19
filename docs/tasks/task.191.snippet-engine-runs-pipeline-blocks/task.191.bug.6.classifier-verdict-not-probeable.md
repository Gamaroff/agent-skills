# Bug Report: Task 191 - `classifyBlock`'s verdict cannot be scored by the probe engine

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, QA-2)
**Date Found**: 2026-10-19

## Description

The change widens the classifier (a boundary). The probe engine scores a JS entry by a falsy return, a thrown error or `{ok: false}`; `classifyBlock` returns `{klass, reason}`, so every case would score accepted and the `shell-exec` corpus — written for exactly this classifier — cannot be run against it. QA probed only the `--diff-base` refusal (35 executed).

## Steps to Reproduce

`security-probe.mjs --sink shell-exec --entry shared/resources/qa-execute-snippets.mjs#classifyBlock` — every case `accepted` regardless of class.

## Expected Behavior

The widened boundary is executed against the hostile corpus (`probes_executed > 0` on the classifier itself).

## Actual Behavior

Not reachable by any entry form.

## Impact

Finalise's DoD security probe hits the same wall; the boundary the task widened stays unmeasured.

## Recommendation

Export a boolean predicate (e.g. `isRunnableBlock(code, bindings, opts)` → `classifyBlock(...).klass === "runnable"`) and record a probe run with `--args-json` carrying a helper root.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: `classifyBlock` returns `{klass, reason}`, an object the probe engine reads as truthy, so the classifier itself could not be probed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: Export `isRunnableBlock(code, bindings, opts)`, true only for `runnable`.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`

**Testing**: `T191 QA-2: isRunnableBlock is classifyBlock as a predicate`. Probe: `security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --args-json '[{}, {"helperRoot": "<repo>"}]'` → engages, 31/31; with a 12-case helper cases file (the cycle-1 repros plus 2 legitimate shipped-helper calls) → engages, 12/12, 0 reproduced, 0 over-blocked.

**Verification Steps for QA**: Re-run the probe and record it in this cycle's security run record.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

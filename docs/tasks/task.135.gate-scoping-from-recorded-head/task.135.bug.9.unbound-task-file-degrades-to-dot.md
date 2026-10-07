# Bug Report: Task 135 - An unbound $TASK_FILE turns Phase 0 into "no gate" and SAFETY_REPROBE=false

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-9
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 3 safety re-probe, CR3-1)
**Date Found**: 2026-09-30

## Description
Phase 0 steps 2, 3 and 5 derive `TASK_DIR=$(dirname "$TASK_FILE")`. `$TASK_FILE` is an input the agent re-binds per block, but nothing checks that it did: unbound, `dirname ""` is `.`, `qa-cycle.sh` finds no gate, and the step-5 probe returns `SAFETY_REPROBE=false` — which the agent then binds in Step 3b, narrowing cycle 3+ after a security FAIL (the CR2-1 outcome by another road). Same for `$STORY_FILE` in qa-story. Probe output: `TASK_DIR=. LATEST_GATE=[] SAFETY_REPROBE=false`.

## Recommendation
Each block that reads the work-item path HALTs when it is empty or not a regular file. Test with it unset.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Every block that derives from the work-item path validates it first: `[ -f "$TASK_FILE" ] || HALT` (qa-task Phase 0 steps 2, 3, 5; qa-story steps 2, 5 with `$STORY_FILE`). Tests J1, J3 (bash + zsh, both skills); mutation M17 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 3 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 3 |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 4 |

# Bug Report: Task 135 - The Phase 0 trigger reads $LATEST_GATE from another shell

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass, CR2-3)
**Date Found**: 2026-09-30

## Description
qa-task Phase 0 step 3's block reads `$LATEST_GATE`, set only in the step 1 block. In its own shell `GATE_HEAD` is empty, both signals read `1`, the PASS-skip can never fire, and the recorded cause is falsely "no head (schema 1)". The same defect cycle 1 fixed in Step 3b, missed at its sibling.

## Recommendation
Bind `LATEST_GATE` at the top of the block with `qa-cycle.sh`, and test the block with `LATEST_GATE` absent from the environment.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: Phase 0 step 3 binds `TASK_DIR` and `LATEST_GATE` in its own block (and step 2 too). Test F9; mutation M12 red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 2 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 2 |

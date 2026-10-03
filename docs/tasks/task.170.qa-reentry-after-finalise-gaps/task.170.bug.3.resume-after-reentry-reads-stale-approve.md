# Bug Report: Task 170 - A resume after the re-entry reads the old APPROVE and goes to Step 7

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute review, CR-1; verified against the resume contract)
**Date Found**: 2026-10-03

## Description

After `reenter-qa-after-finalise.sh` lowers the lock to step 5 / `qa_phase: 5a`, the implementation
report's highest `### QA Cycle {N}` entry is still the original run's — `**Action**: Proceeding to 5c`,
`**PR Review**: APPROVE` — until cycle N+1's 5a writes a new entry, which happens only after a whole
`/qa-task` run. The resume contract's 5c sub-state table reads that row as the source of truth
(`APPROVE or CONCERNS → 5c cleared — Step 5–6 is complete, go to Step 7`), and the 5–6 artifact row
does the same. Nothing on the resume path reads `qa_reentry` (`develop-pipeline-pause.md`: "No reader
branches on it").

## Steps to Reproduce

1. Re-enter after a DoD-gaps halt (lock at 5, `qa_reentry` set, last report entry APPROVE).
2. A PreCompact pause or a HALT before cycle N+1's 5a writes its entry.
3. Resume: the contract's table sends the run to Step 7.

## Expected Behavior

The resume re-enters at 5a as cycle N+1.

## Actual Behavior

The resume goes to Step 7 and `/finalise` re-runs over the ungated head — the defect task.170 exists to close.

## Impact

The re-entry can be undone by any interruption in its widest window.

## Recommendation

A precedence rule in the contract's 5c sub-state reading: a `qa_reentry` on the lock or snapshot whose
`gate_head` equals the newest gate's `head:` means the last entry's verdict predates the re-entry —
resume at 5a as cycle N+1. Self-clearing once cycle N+1 writes a new gate. Remove "No reader branches
on it" from the lock schema; pin the rule with a test.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-03

**Fix Description**: a second precedence in the resume contract's 5c sub-state paragraph, and the same clause in both 5–6 artifact rows: a `qa_reentry` on the lock or snapshot whose `gate_head` equals the newest gate's `head:` means the entry's terminal verdict predates the re-entry — re-enter at 5a as cycle N+1. Self-clearing once the re-entered cycle writes a gate. The lock schema now names this as `qa_reentry`'s one reader.

**Files Modified**: `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-pause.md`, `evals/shared/tests/reenter-qa-refusals-parity.test.mjs` (new test: the precedence names qa_reentry / gate_head / 5a / N+1, both rows carry the clause, the schema no longer says "No reader").

**Testing**: parity 4/4; removing the clause from the rows turns it red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 2            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 2        |

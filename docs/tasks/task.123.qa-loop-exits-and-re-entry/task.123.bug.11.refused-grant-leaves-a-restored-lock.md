# Bug Report: Task 123 - A refused grant leaves a freshly restored lock on disk

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 4, CR-1 — verified)
**Date Found**: 2026-09-19

## Description
The never-lower guard runs after the snapshot restore. A refused grant (reproduced: snapshot `qa_max_cycles: 9`, base 6, k=2) exits 1 but leaves a restored lock carrying the snapshot's `qa_phase: 5b` and no grant — contradicting the header's "lock untouched", so the Stop hook names `/qa-fix` and the next resume sees an active lock instead of the halt snapshot.

## Steps to Reproduce
See the QA report (`task.123.qa.4.qa-loop-exits-and-re-entry.md`, Code Review section, CR-1).

## Expected Behavior
A refusal writes nothing: no lock is restored, or a lock restored for the refused grant is removed again.

## Actual Behavior
The lock is restored before the guard decides.

## Impact
A refused grant turns a halted run into a mid-loop one with no budget change.

## Recommendation
Evaluate the never-lower guard against the snapshot's `qa_max_cycles` before restoring, and on any refusal after a restore remove the restored lock; add a suite row asserting no lock exists after a refused grant from a snapshot.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 4 (CR-1) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 4 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The never-lower guard was evaluated only after the restore had written the lock.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- The guard now runs **before** any restore, against whichever file the grant would land on (the lock if present, else the snapshot); a lock restored in this call is removed again on any later failure (`undo_restore`). The refusal message names the smallest accepted `k` and says no grant is needed to run up to the existing budget (C4-CR-5). A non-integer `qa_max_cycles` is warned about and treated as 0 (C4-CR-7).

**Files Modified**:
- `shared/resources/grant-qa-cycles.sh`, `shared/resources/grant-qa-cycles.test.sh` (+7 → 41)

**Testing**:
- suite 41/41; mutation: guard disabled → 2 red.

**Verification Steps for QA**:
1. Snapshot with `qa_max_cycles: 9`, no lock, gate.6, k=2 → exit 1, no lock on disk, message says `k must be at least 4`.
| 2026-09-19 | Closed | QA | Verified in QA cycle 5: fix present on `0610f64a`, re-executed |

# Bug Report: Task 123 - The declined-grant path claims a set-qa-phase re-assert that cannot run without a lock

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 4, CR-2 — verified)
**Date Found**: 2026-09-19

## Description
Resume contract step 4 says the `set-qa-phase.sh 5a` re-assert is "kept so 5a's own first action holds on a resume that declined the grant" — but after a loop-limit/not-converging HALT the lock exists only if the grant script restored it, so on a declined grant `set-qa-phase.sh` noops (no lock) and the claim cannot hold. The three documents disagree on the declined path: step 4 says 5a, its next sentence says Loop Escalation, SKILL.md says the halt's own options.

## Steps to Reproduce
See the QA report (`task.123.qa.4.qa-loop-exits-and-re-entry.md`, Code Review section, CR-2).

## Expected Behavior
One statement of the declined path: a declined grant never reaches 5a — the run returns to the halt's own options, with no lock and no loop.

## Actual Behavior
Three descriptions, one of them impossible.

## Impact
An operator reading step 4 expects a resumed loop after declining; nothing runs.

## Recommendation
Rewrite step 4: the grant writes `qa_phase: 5a` itself; the re-entry needs no separate call; a declined grant returns to the halt's options (no lock is restored). Align SKILL.md's sentence.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 4 (CR-2) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 4 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: Cycle 3's rewrite of step 4 justified a re-assert with a path (declined grant) on which no lock exists.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- Step 4 now states the declined path once: a declined grant, or a grant the script refuses (exit 1, stderr surfaced), restores no lock and runs no cycle — the run returns to the halt's own options; the HALT messages and both SKILL.md point here. The re-assert justification is gone: 5a's own first action runs as on any cycle and is a noop after the grant.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`

**Testing**:
- lock-fields parity 5/5; `grep -rn 'kept so 5a'` → 0.

**Verification Steps for QA**:
1. Read step 4: one declined-path statement; SKILL.md's sentence references it.

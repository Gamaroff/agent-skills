# Bug Report: Task 124 - Phase 0b's `--restore` runs before the grant's never-lower guard, so a declined or refused grant leaves a restored lock and a consumed snapshot

**Task**: [Link](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Bug ID**: TASK-124-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-19
**Source**: QA cycle 3 (narrowed), code review finding CR-1

## Description
The cycle-2 fix (CR-2) runs `--restore` at the operator's Resume choice, before Phase 0b. On a `loop-limit|not-converging` snapshot the Phase 0b prompt is the halt message's three options plus the grant; if the restore has already run, a declined grant — or one `grant-qa-cycles.sh` refuses on the never-lower guard — leaves a live lock on disk and the snapshot consumed, contradicting the re-entry step 4 ('no lock is restored, no cycle runs, and the run returns to the halt message's own three options') and the task.123 CR-1 refusal-leaves-nothing-behind rule the task doc says is preserved. 'Start fresh' would then have a live lock and no snapshot to delete.

## Steps to Reproduce
HALT at the loop limit; re-invoke; the orchestrator runs `--restore` at Resume; decline the grant → `.claude/state/develop-pipeline.lock` exists, `last-halt.json` is gone.

## Expected Behavior
On a loop-escalation snapshot the grant prompt comes first and the grant (accepted) is what restores the lock, via `grant-qa-cycles.sh` → `--restore`; a plain Resume (any other halt_reason, or a PreCompact pause) runs `--restore` directly. A declined or refused grant restores nothing and consumes nothing.

## Actual Behavior
Restore precedes the grant decision.

## Impact
A refused re-entry leaves state behind; the next invocation sees a lock and asks the wrong question.

## Recommendation
State the order in step-0 §0b and the resume contract: branch on `halt_reason` before restoring; rewrite step 4 to describe exactly what a refused grant leaves on disk (nothing).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Developer**: qa-fix (pipeline)

**Root Cause Analysis**:
The cycle-2 fix placed the restore at the Resume choice without branching on why the run halted; on a loop-escalation snapshot the grant already owns the restore, and the grant's refusal rule presumes nothing was restored before it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
The resume contract's 'Restore the lock (both resume paths)' branches on `halt_reason`: `loop-limit|not-converging` → no restore here, the grant prompt comes first and `grant-qa-cycles.sh` restores only after its never-lower guard passes; any other halt or a PreCompact pause → `--restore` directly. Step-0 §0b and the three orchestrators' Step 0-lock carry the same exception. Re-entry step 4's 'no lock is restored' is true again.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md`, `develop-pipeline-step-0-resolve-and-prepare.md`
- `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`

**Testing**:
- prose; the grant's refusal-leaves-nothing-behind case is pinned by `grant-qa-cycles.test.sh` (never-lower refusal from a snapshot → no lock, snapshot kept), which remains 41/41

**Verification Steps for QA**:
1. `grep -n 'loop-limit|not-converging' shared/resources/develop-pipeline-resume-contract.md` → the branch under 'Restore the lock (both resume paths)'
2. HALT at the loop limit; re-invoke; decline the grant → no lock on disk, snapshot still present

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-19 | New | QA Engineer | Found in QA cycle 3 |
| 2026-09-19 | In Progress | qa-fix | Investigation started |
| 2026-09-19 | Ready for QA | qa-fix | Fix implemented |

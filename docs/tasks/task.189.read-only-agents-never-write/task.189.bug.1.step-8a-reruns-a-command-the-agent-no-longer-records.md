---
type: bug
id: task.189.bug.1
status: closed
severity: medium
priority: P2
created: 2026-10-16
---

# Bug Report: Task 189 - finalise Step 8a re-runs a command the agent no longer records

**Task**: [task.189.read-only-agents-never-write.md](./task.189.read-only-agents-never-write.md)
**Bug ID**: TASK-189-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 1, finding CR-1)
**Date Found**: 2026-10-16

## Description

`skills/finalise/SKILL.md:2825` (Step 8a.4, fix-and-recheck) says to re-run "the engine command the agent recorded (`security-probe.mjs … --record …`)". Under task.189 the security agent returns only `probe_plan[]`; no command is recorded anywhere.

## Expected Behavior

Step 8a.4 re-runs Step 3b.1's runner on the saved plan (`.claude/state/probe-plan.json`) into this run's record, so the record's `totals.executed` is refreshed from the fixed tree.

## Actual Behavior

Step 8a.4 names a command that no longer exists, so a low-severity security fix-and-recheck has no instruction to follow.

## Impact

The bounded fix-and-recheck path for a low security finding cannot be followed as written; an agent improvises or halts.

## Recommendation

Point Step 8a.4 at `security-probe-plan.mjs` with the saved plan and this run's record path; grep showed this is the only remaining consumer of the old contract.

## Developer Fix Cycle

### Iteration 1

#### Investigation

**Date**: 2026-10-16
**Developer**: qa-fix (develop-task Step 5b, cycle 1)

**Root Cause**: Step 8a.4 was written for the obs #10 contract, under which the agent recorded an engine command; task.189 removed that command and Step 8a.4 was not in the change's population.

#### Fix Implementation

**Fix Description**: Step 8a.4 now re-runs Step 3b.1's block on the plan it saved at `.claude/state/probe-plan.json`, into this run's record. A contract assertion pins it (and the absence of the old wording).

**Files Modified**: `skills/finalise/SKILL.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

**Testing**: `command node --test shared/resources/tests/read-only-agent-writes.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/explore-prompts-no-write.test.js` — green; the fix was mutation-proven (revert → the named test goes red).

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Found by task.189.qa.1.read-only-agents-never-write.md |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-10-16 | Closed | qa-task | Verified by task.189.qa.2.read-only-agents-never-write.md |

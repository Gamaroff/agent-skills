---
type: bug
id: task.189.bug.3
status: ready-for-qa
severity: medium
priority: P2
created: 2026-10-16
---

# Bug Report: Task 189 - the runner's owned-flag refusal cannot be probed by the engine

**Task**: [task.189.read-only-agents-never-write.md](./task.189.read-only-agents-never-write.md)
**Bug ID**: TASK-189-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 1, finding QA-1)
**Date Found**: 2026-10-16

## Description

`ownedFlagIn(argv)` in `shared/resources/security-probe-plan.mjs` is a refusal boundary (the runner refuses a plan entry that carries `--record`, `--repo-root`, `--cases-file`, `--json`, `--emit-block`). It returns the offending flag (a truthy string) for a refused entry and `null` for an allowed one; the probe engine reads a string as acceptance and `null` as refusal, so probing it scores every refusal as accepted. QA could not record `probes_executed` for it, and finalise's zero-guard would fail the DoD on the same record.

## Expected Behavior

An exported, accept-shaped predicate (returns the argv when allowed, `null`/`false` when refused) that the engine can probe with a cases file, and a probe record with a positive count.

## Actual Behavior

The boundary is tested only by the fixture test's one `--record` case; no engine probe can run against it.

## Impact

The DoD security section would hit the zero-guard on this boundary, and `--record=…`, `--repo-root` and `--emit-block` refusals have no committed case.

## Recommendation

Export `planArgvAllowed(argv)` (or similar) returning argv or `null`, have `ownedFlagIn` remain the internal helper, and add owned-flag cases (each flag, `--flag=value` form) to the fixture test.

## Developer Fix Cycle

### Iteration 1

#### Investigation

**Date**: 2026-10-16
**Developer**: qa-fix (develop-task Step 5b, cycle 1)

**Root Cause**: `ownedFlagIn` answers the question "which owned flag is present?", so its return is truthy on a refusal — the inverse of the engine's accept/refuse reading.

#### Fix Implementation

**Fix Description**: New exported `planArgvAllowed(argv)` returns argv when the runner may run it and `null` when refused (non-array, empty, non-string element, or any owned flag in either spelling); the runner gates on it. Tests: every owned flag in both spellings, malformed argvs, a value merely containing a flag name, and the `--repo-root=/` spelling through the lifted Step 3b.1 block.

**Files Modified**: `shared/resources/security-probe-plan.mjs`, `shared/resources/tests/read-only-agent-writes.test.mjs`

**Testing**: `command node --test shared/resources/tests/read-only-agent-writes.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/explore-prompts-no-write.test.js` — green; the fix was mutation-proven (revert → the named test goes red).

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Found by task.189.qa.1.read-only-agents-never-write.md |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA cycle 1 |

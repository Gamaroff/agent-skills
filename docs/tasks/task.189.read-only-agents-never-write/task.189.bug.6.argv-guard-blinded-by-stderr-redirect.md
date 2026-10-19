---
type: bug
id: task.189.bug.6
status: ready-for-qa
severity: medium
priority: P2
created: 2026-10-17
---

# Bug Report: Task 189 - The argv-order guard can no longer see the budget import's stderr

**Task**: [task.189.read-only-agents-never-write.md](./task.189.read-only-agents-never-write.md)
**Bug ID**: TASK-189-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 6, finding CR6-1)
**Date Found**: 2026-10-17

## Description

Cycle 5's fix for CR5-1 added `2>/dev/null` to the BUDGET one-liner in `skills/finalise/SKILL.md` Step 3b.1 (line 552). That stderr was the only place an `unknown argument` error from the runner's CLI path could appear when the import is mistaken for a CLI run. The cycle-4 guard `assert.ok(!/unknown argument/.test(r.stderr), r.stderr)` in `shared/resources/tests/read-only-agent-writes.test.mjs:689` reads the block's stderr, so it can no longer fail.

## Steps to Reproduce

1. Read `skills/finalise/SKILL.md:546-552`: the import's stderr goes to `/dev/null`.
2. Read `shared/resources/tests/read-only-agent-writes.test.mjs:689`: the assertion reads `r.stderr` of the block.

## Expected Behavior

The guard can go red when the budget import runs the runner as a CLI.

## Actual Behavior

The assertion is vacuous. The behaviour is still held elsewhere, measured this cycle: swapping the argv order reds the budget assertion in the same test, and an entry guard that always runs `main` reds the whole file, which imports the runner. The vacuous line itself catches neither.

## Impact

The test reads as a guard it no longer is. A future regression whose only symptom is stderr from the import would pass.

## Recommendation

Send the import's stderr to a file the block (and the test) can read, or replace the assertion with one the redirect cannot hide, such as a stand-in runner whose CLI path writes a sentinel file.

## Developer Fix Cycle

### Iteration 1

#### Investigation

**Date**: 2026-10-17
**Developer**: qa-fix (develop-task Step 5b, cycle 6)

**Root Cause**: cycle 5 silenced the budget import's stderr in the block so a failed load prints one warning rather than a stack; the cycle-4 test kept reading the block's stderr, which no longer carries it.

#### Fix Implementation

**Fix Description**: the test now replaces the block's `"$RUNNER" 2>/dev/null)` with a redirect to `.budget.err` (asserting the anchor text occurs exactly once, so a moved redirect fails loudly) and asserts that file is empty. The block keeps `2>/dev/null`. Same cycle: the killed-runner test asserts the wait log (CR6-3); the CR5-1 test requires a non-zero exit and a wait log of only `--clear` (CR6-4); the budget `case` uses `set-waiting-on.sh`'s own pattern, `''|*[!0-9]*|0*` (CR6-5).

**Files Modified**: `shared/resources/tests/read-only-agent-writes.test.mjs`, `skills/finalise/SKILL.md`

**Testing**: `read-only-agent-writes.test.mjs` 21/21; with `finalise-dod-prompt-contract.test.mjs` 56/56. Mutation proofs: an import that runs the runner as a CLI while still printing the right budget → the new test red (`unknown argument: …security-probe-plan.mjs`), the HEAD test green (the defect, reproduced); a wait marked for a runner that did not load → CR5-1 test red; the budget path skipped for a loaded runner → killed-runner test red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-16 | Ready for QA | qa-fix | Fix implemented (cycle 6) |

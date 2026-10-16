---
type: bug
id: task.189.bug.2
status: ready-for-qa
severity: medium
priority: P2
created: 2026-10-16
---

# Bug Report: Task 189 - security-probe-plan.mjs drops the engine's escapes

**Task**: [task.189.read-only-agents-never-write.md](./task.189.read-only-agents-never-write.md)
**Bug ID**: TASK-189-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 1, finding CR-2)
**Date Found**: 2026-10-16

## Description

`shared/resources/security-probe-plan.mjs` (around `out.runs.push`, :244) keeps `verdict` and `executed` from the engine's JSON but drops `escapes[]` — the engine's signal that a probe wrote outside its sandbox, which it reports with exit 1 even on an `engages` verdict. Step 3b.1 reads only `probes_executed`, `probes` and `refusals`.

## Expected Behavior

An escape reaches the DoD: the runner reports it, and Step 3b.1 adds a FAIL check for it.

## Actual Behavior

A sandbox escape is silently dropped; the DoD reads a clean run.

## Impact

A probe that wrote outside its sandbox — a security-relevant event — is invisible at acceptance.

## Recommendation

Carry `escapes` into `runs[]` and a top-level `escapes` field; Step 3b.1 adds a FAIL check when it is non-empty; a fixture test pins it.

## Developer Fix Cycle

### Iteration 1

#### Investigation

**Date**: 2026-10-16
**Developer**: qa-fix (develop-task Step 5b, cycle 1)

**Root Cause**: The runner copied verdict and executed from the engine's JSON and nothing else; `escapes[]` was dropped.

#### Fix Implementation

**Fix Description**: `security-probe-plan.mjs` carries each run's escape count in `runs[].escapes` and every escape in a top-level `escapes[]`; Step 3b.1 item 4 adds a `probe escaped its sandbox` FAIL check per escape, whatever the verdict. Test: the existing `engaging-but-escaping` fixture (verdict `engages`, 12 escapes).

**Files Modified**: `shared/resources/security-probe-plan.mjs`, `skills/finalise/SKILL.md`, `shared/resources/tests/read-only-agent-writes.test.mjs`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

**Testing**: `command node --test shared/resources/tests/read-only-agent-writes.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/explore-prompts-no-write.test.js` — green; the fix was mutation-proven (revert → the named test goes red).

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-16 | New | qa-task | Found by task.189.qa.1.read-only-agents-never-write.md |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA cycle 1 |

# Bug Report: Task 251 - The plan functions carry no ok field, so the boundary probe cannot score a refusal

**Task**: [Link](./task.251.record-loop-limit-residual-acceptance.md)
**Bug ID**: TASK-251-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-11-03

## Description

`planGateEdit` and `planReportEdit` return `{ state, ... }`. The probe engine treats a result as a
rejection only when it has an own `ok` property that is strictly `false`. The writer refuses by
`state`, so every hostile case scores as accepted.

## Steps to Reproduce

```bash
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure \
  --entry 'shared/resources/accept-qa-residual.js#planReportEdit' \
  --args-json '[5,{"approvedBy":"Owner","reason":"r","date":"2026-11-03","waived":[]}]' \
  --repo-root "$PWD" --json
```

## Expected Behavior

At least one hostile case is rejected, so the verdict is a real measurement.

## Actual Behavior

15 executed, 9 hostile reproduced, 0 escaped, verdict `absent` (`no-hostile-case-was-rejected`).

## Impact

`/finalise` runs its own probe on the same entry and would hit the same verdict, stopping the DoD on
a result that says nothing about the code.

## Recommendation

Add `ok` to every result of both plan functions (`false` for each refusal, `true` for `edit` and
`already`), keeping `state`. Re-run the probe.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-11-03 (QA cycle 1 fix)

**Root cause**: the planners refuse by `state`, a field the probe engine does not read.

**Fix**: `planGateEdit` and `planReportEdit` are thin wrappers that add `ok` (true for `edit` and
`already`, false for every refusal) over the unchanged planners; `state` is kept.

**Probe re-run**: the generic markdown corpus has no QA Cycle entry, so the planner (correctly) refuses
its legitimate inputs too and the engine answers `rejects-every-input`. A cases file with one
legitimate report and five reports the planner must refuse
(`task.251.qa.1.security.cases.json`) gives `engages`: 1 legitimate accepted, 5 hostile rejected.
Before the fix the same entry read `absent`.

**Files**: `shared/resources/accept-qa-residual.js` (+ bundled copies), `shared/resources/tests/accept-qa-residual.test.mjs`, the cases file.

**Test**: "every plan result carries ok" (proven red when `ok` is forced true).

## Status History

| Date       | Status       | Changed By | Notes                         |
| ---------- | ------------ | ---------- | ----------------------------- |
| 2026-11-03 | New          | QA         | Found in QA cycle 1           |
| 2026-11-03 | Ready for QA | qa-fix     | Fixed with a mutation-proven test |

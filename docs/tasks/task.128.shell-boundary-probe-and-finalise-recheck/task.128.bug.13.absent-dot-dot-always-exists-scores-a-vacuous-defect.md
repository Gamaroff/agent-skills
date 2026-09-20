# Bug Report: Task 128 - `absent: [".."]` passes validation and always "exists", so the fixed script scores `absent` with a full count

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md) · **Bug ID**: TASK-128-BUG-13 · **Severity**: MEDIUM · **Priority**: P2 · **Status**: ✅ Closed · **Found By**: QA (cycle-4 review CR-1, reproduced) · **Date Found**: 2026-09-20

## Description
`expectedProblem` rejects separators and NUL in `absent` entries but not `.` / `..`, which carry neither. `existsSync(join(fixtureDir, ".."))` is always true, so every hostile case mismatches, every case is `accepted`, and the **fixed** `qa-cycle.sh` scores `absent` — executed 4 — the bad-case-scored-as-defect class BUG-11 was fixed for, one entry short.

## Steps to Reproduce
`expectedProblem({ exit: 0, absent: [".."] })` → `null`; a cases file with that `absent` against the fixed script → `absent / no-hostile-case-was-rejected / executed 4`, detail `.. was created`.

## Recommendation
Reject `.` and `..` (and, where the fixture is known, a name that collides with a control or the case's own input) in the validator, declining the case.

## Developer Fix Cycle — Iteration 1
**Fix**: `expectedProblem` rejects `.` and `..` in `absent`; `runShellCase` additionally declines an `absent` name that the fixture itself creates (a control or the case's own input). Test: `.`, `..`, a control name and the case's own input → declined, executed 0. Also in this cycle: CR-2 (launch-failure regex `mi`), CR-3 (escapes + shells carried through the all-errored decline, with a writes-then-hangs fixture), CR-4 (BUG-12 test cleanup in `finally`, real temp dir asserted).
**Mutation proof**: checks removed → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | . / .. / collisions rejected |
| 2026-09-20 | Closed | QA Engineer | Verified fixed at cycle 5 (execution: `.`/`..` decline; control and input collisions decline; hostile shapes executed 0) |

# Bug Report: Task 128 - a malformed `expected` (wrong types) scores `absent` with a full count, or throws

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md) · **Bug ID**: TASK-128-BUG-11 · **Severity**: MEDIUM · **Priority**: P2 · **Status**: ✅ Closed · **Found By**: QA (cycle-3 review CR-3, reproduced) · **Date Found**: 2026-09-20

## Description
The BUG-8 guard checks that `expected` *names* a comparable key, not its type. `{ stdout: 12 }` or `{ stdout: null }` mismatches every run → every hostile case `accepted` → `absent`, executed 4 — a malformed case and a real defect report the same value. `{ exit: 0, absent: 5 }` throws `TypeError: number 5 is not iterable` out of `runProbeSpec` (BUG-3's class).

## Recommendation
Validate per case in `runShellCase`: `stdout`/`stderr` strings, `exit` an integer, `absent` an array of separator-free strings; decline with a named reason on any violation — mirroring what the corpus schema test asserts for corpus cases.

## Developer Fix Cycle — Iteration 1
**Fix**: `expectedProblem(expected)` — object check, at least one comparable key, `stdout`/`stderr` strings, `exit` integer, `absent` an array of non-empty separator-free strings; `runShellCase` declines with the named reason. Six malformed shapes tested against the pre-fix fixture: executed 0, no throw.
**Mutation proof**: type checks replaced by the key-presence check → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | expected validated per case |
| 2026-09-20 | Closed | QA Engineer | Verified fixed at cycle 4 (execution) |

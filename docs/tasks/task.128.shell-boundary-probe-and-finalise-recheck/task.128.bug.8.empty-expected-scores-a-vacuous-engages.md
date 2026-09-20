# Bug Report: Task 128 - a case whose `expected` compares nothing scores the pre-fix script `engages`

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (safety re-probe — surface enumeration of `compareExpected`)
**Date Found**: 2026-09-20

## Description
`compareExpected` compares only the keys present in `expected`. A case with `expected: {}` (or `{ absent: [...] }` alone) matches every run, so every hostile case is `rejected` and every legitimate one `accepted`: the **pre-fix** `qa-cycle.sh` scores `engages` with `executed: 4`. The corpus's own cases are schema-tested, but `--cases-file` is a documented CLI option that bypasses that test — the engine's own guard against a probe that compares nothing is what the corpus check was standing in for.

## Steps to Reproduce
`runProbeSpec({ sink: "filename", entry: "shell:tests/fixtures/qa-cycle.prefix.sh", cases: [{…, expected: {}}, …] })` → `engages`.

## Expected Behavior
A case whose `expected` carries none of `stdout` / `exit` / `stderr` is declined (`errored`: "expected compares nothing"), never scored.

## Recommendation
Guard in `runShellCase` (or `compareExpected`); test with an empty and an absent-only `expected` against the pre-fix fixture.

## Developer Fix Cycle

### Iteration 1
**Fix**: `runShellCase` declines a case whose `expected` carries none of `stdout` / `exit` / `stderr` (`COMPARABLE_KEYS`) — "case's `expected` compares nothing". Test: empty and absent-only `expected` against the pre-fix fixture → executed 0, `unverifiable`; a single comparable key is scored.
**Mutation proof**: guard removed → test red (pre-fix script engages again).

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | comparable-keys guard |

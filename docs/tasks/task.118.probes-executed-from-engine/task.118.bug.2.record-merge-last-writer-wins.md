# Bug Report: Task 118 - Concurrent `--record` runs on one file lose controls (last-writer-wins merge)

**Task**: [Link](./task.118.probes-executed-from-engine.md)
**Bug ID**: TASK-118-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-2 refute pass CR2-1, reproduced)
**Date Found**: 2026-09-17

## Description

`recordRun` is an unlocked read → filter → push → write-temp → rename. The prose mandates one
record per review with every control merged into it, and an agent issuing its probes as parallel
tool calls will run several engine processes against that file at once. Each reads the record as
it stood before any of them wrote, and the last rename wins: every other run's control is silently
dropped. `--emit-block` then undercounts `probes_executed` and omits a probed control — possibly a
`present-but-inert` one, which is the finding the review exists to surface.

## Steps to Reproduce

```bash
R=$(mktemp -d)/run.json; E=shared/resources/security-probe.mjs
node $E --sink url-authority --entry 'skills/review-security/tests/fixtures/redis-tls/engaged.mjs#buildRedisOptions' --record $R --name a &
node $E --sink url-authority --entry 'skills/review-security/tests/fixtures/redis-tls/inert.mjs#buildRedisOptions'   --record $R --name c &
wait; jq -c '{n:(.controls|length), names:[.controls[].name]}' $R
# → {"n":1,"names":["a"]}   (expected n: 2)
```

## Expected Behavior

Concurrent runs against one record converge: the record ends with every control, and totals
reflect all of them.

## Actual Behavior

One control survives; the block reads fewer probes than ran and lists fewer controls than were probed.

## Impact

Silent undercount in the artefact this task made authoritative — the opposite direction from the
defect it fixed, but the same shape: a block that reads as complete and is not.

## Recommendation

Serialise the merge with an exclusive lock (`O_EXCL` lock-file create with bounded retry) around
read → merge → rename, and cover it with a test that runs N probes concurrently and asserts N
controls.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17
**Developer**: qa-fix (develop-task pipeline)

**Root Cause Analysis**: `recordRun` read the record, merged in memory, and renamed a temp file
over it with nothing serialising the sequence against another engine process. The temp+rename
made each individual write atomic, which is a different property from the merge being atomic —
two atomic writes of two stale snapshots still lose one.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**:
- `withRecordLock(recordPath, fn)` — an `O_EXCL` lock file (`{record}.lock`) taken around read → merge → rename; 25 ms retry via `Atomics.wait`, 20 s timeout, and a lock older than 30 s is reclaimed as left by a dead holder. The read now happens **inside** the lock.
- Temp file removed on a failed rename (CR2-7); `preflightRecord` validates the existing record and creates the directory before the probe run (CR2-4).

**Files Modified**:
- `shared/resources/security-probe.mjs` (+ bundled copies)
- `skills/review-security/tests/review-security.test.js`

**Testing**:
- Three concurrent engine runs against one record → 3 controls, totals summed, no lock or temp left.
- A pre-held lock blocks the write (child still waiting at 700 ms) until released; a lock aged 60 s is reclaimed in under 2 s.
- Mutation: making the lock a no-op reds both lock tests.

**Verification Steps for QA**:
1. Run the three-process repro from the bug — expect `n: 3`.
2. `node --test skills/review-security/tests/review-security.test.js` → the two lock tests pass; stub `withRecordLock` to `return fn()` and they fail.

## Status History

| Date       | Status       | Changed By | Notes                                         |
| ---------- | ------------ | ---------- | --------------------------------------------- |
| 2026-09-17 | New          | QA         | Found by the cycle-2 refute pass (CR2-1), reproduced 3 → 1 |
| 2026-09-17 | In Progress  | qa-fix     | Root cause: atomic write ≠ atomic merge       |
| 2026-09-17 | Ready for QA | qa-fix     | Exclusive lock around read→merge→rename; two deterministic lock tests, mutation-proven |
| 2026-09-17 | Closed       | QA         | Cycle 3: 3-process repro → 3 controls; lock no-op reds 3 tests. Residual reclaim TOCTOU tracked as CR3-2 |

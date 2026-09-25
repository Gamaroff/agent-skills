# Bug Report: Task 148 - The 5b offer snippet fails silently on a malformed HIGH sequence

**Task**: [task.148](./task.148.structural-move-before-prose-patch.md)
**Bug ID**: TASK-148-BUG-2 (code review CR-2)
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, diff code review)
**Date Found**: 2026-09-25

## Description

The `#### Narrowing-residue offer` snippet in `shared/resources/develop-pipeline-step-5-6-qa-loop.md` calls `JSON.parse(process.argv[2])` outside the engine's guarded input handling. An empty or malformed `$HIGH_SEQUENCE_JSON` makes node throw. `NARROWING_JSON` and `NARROWING_SIGNAL` both come back empty, and the block exits 0.

## Steps to Reproduce

Run the section's bash block from a consumer-shaped cwd with `CYCLE=3 HIGH_SEQUENCE_JSON='' GATE_N=x GATE_N1=y`. Output: `rc=0 JSON=[] SIGNAL=[]`, and a Node stack trace on stderr.

## Expected Behavior

The engine answers `high-counts-missing`. Its own guard exists for exactly this input. The document also states what to do when the engine did not run.

## Actual Behavior

"Could not look" is byte-identical to "no offer". The Decisions Log line the section asks for logs nothing.

## Impact

The offer silently never fires on a run whose HIGH sequence was mis-bound. That is the same class of failure as `empty` versus `scan-broken`.

## Recommendation

Parse inside a `try`, and pass the raw value to the engine on failure. Add a stated branch: if `NARROWING_JSON` is empty, log "narrowing offer: engine did not run" in the Decisions Log. Add a snippet test with a blank sequence.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-25

Reproduced: `HIGH_SEQUENCE_JSON=''` → `rc=0 JSON=[] SIGNAL=[]`. The snippet's `JSON.parse` threw before the engine's own guard could answer.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-25

The snippet parses inside `try` and hands an unparseable value over raw, so the engine answers `high-counts-missing`. An empty `NARROWING_JSON` (engine absent, or node failed) now sets `NARROWING_SIGNAL=error`, prints `narrowing offer: engine did not run` to stderr, and the prose says to log it in the Decisions Log as a check that could not look. Advisory findings in the same block were taken as well: CR-4 (the table is now described as substituted, not bound, and `$GATE_N` is named as 5a's `$LATEST_GATE`) and CR-6 (the prompt block opens with `{message}` alone).

**Files Modified**:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (+ bundled copies)
- `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs` — blank/malformed sequence → `high-counts-missing`; no engine → `SIGNAL=error`; prompt-block prefix; the cycle-3 run now under bash and zsh

**Testing**: Mutation-proved: removing the `try` → blank-sequence test red; removing `NARROWING_SIGNAL=error` → no-engine test red; restoring the doubled prefix → prefix test red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-25 | New | QA Engineer | QA cycle 1 |
| 2026-09-25 | In Progress | qa-fix | Root cause confirmed by reproduction |
| 2026-09-25 | Ready for QA | qa-fix | Fixed in QA cycle 1; mutation-proved |
| 2026-09-25 | Closed | QA Engineer | Verified in QA cycle 2 (refute pass) |

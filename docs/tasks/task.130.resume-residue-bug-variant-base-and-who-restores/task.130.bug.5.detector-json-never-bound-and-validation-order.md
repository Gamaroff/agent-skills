# Bug Report: Task 130 - no fenced block binds `DETECTOR_JSON`, and the delete block HALTs on input the schema check says to fall back on

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass CR-3 + CR-4)
**Date Found**: 2026-09-20

## Description

Two neighbouring statements in § Consume Output now disagree. (a) The schema check reads a literal `<output>` placeholder and no fenced block assigns `DETECTOR_JSON`; after the bug-2 fix the delete block's `:?` guard HALTs on every resume unless the agent improvises the binding, and validation and deletion read the detector output through two different derivations. (b) The sentence after the schema check says an invalid result is *logged and the run proceeds to Phase 0b with full verification*, while the unconditional delete block that follows says "run it before Phase 0b" and HALTs (exit 1) on unparsable JSON or a non-array `deltas_since_pause` — one input, two prescribed outcomes; the schema check also does not require the array the delete block insists on.

## Expected Behavior

One binding: the schema-check block assigns `DETECTOR_JSON` from the detector's output file and validates it — including `(.deltas_since_pause | type == "array")`; the delete block reads that variable and runs only when validation passed, so the fallback sentence and the fail-closed block cannot both apply to one input.

## Actual Behavior

Unbound variable in every fence; contradictory prescriptions for invalid output.

## Impact

Medium. A fresh shell following the fences literally HALTs at the guard; an invalid detector output is either "fall back" or "HALT" depending on which sentence the agent reads first.

## Recommendation

Bind once in the schema block (`DETECTOR_JSON=$(cat <output-file>)`), extend its `jq -e` to the array check, and open the delete block with "only after the schema check passed"; drop the array `error()` from the delete filter since the schema check now owns it (or keep it as belt-and-braces with the same message). Test: the schema check rejects a non-array.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 2)

**Root Cause Analysis**: the schema check read a literal `<output>` placeholder and nothing assigned `DETECTOR_JSON`; the delete block was unconditional while the sentence before it prescribed a fallback for invalid output.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: the schema-check block opens with `DETECTOR_JSON=$(cat <detector-output-file>)` and validates that variable, now including `(.deltas_since_pause | type == "array")`; the fallback sentence says to **skip the delete block** on invalid output; the delete block's opening sentence says "only after the schema check above passed", its `:?` message points at the schema block, and its array `error()` is gone (the schema check owns it).

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — schema block binds `DETECTOR_JSON` and checks the array; delete block: exact label, string-path check, canonical-path containment, gated on validation
- `shared/resources/pipeline-resume-detector-prompt.md` — names `stale-snapshot: PR merged` as the only label the orchestrator acts on
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — cases H (both skip notes kept), I (foreign path → HALT, nothing deleted), J (no path → HALT, never `rm -f null`), K (schema block binds and rejects a non-array); 23/23 under bash and zsh
- bundled `skills/*/references/` regenerated

**Testing**: K — the extracted schema block binds a non-empty `DETECTOR_JSON` and exits 0 on a well-formed file, 1 on a non-array. Mutation: array check dropped → K red; restored → green.

**Verification Steps for QA**:
1. Extract the schema block, point `<detector-output-file>` at a JSON with `"deltas_since_pause":"nope"` → the `jq -e` exits 1; at a well-formed file → 0 and `${#DETECTOR_JSON}` > 0.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 3 (boundary re-probe; mutation covered) |

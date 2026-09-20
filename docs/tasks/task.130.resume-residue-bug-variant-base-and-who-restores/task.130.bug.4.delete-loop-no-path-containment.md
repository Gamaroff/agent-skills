# Bug Report: Task 130 - the delete loop removes any reported `path`, and a missing `path` becomes `rm -f null`

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass CR-2, reproduced by QA)
**Date Found**: 2026-09-20

## Description

The Consume Output loop `rm -f`s whatever `.path` string the detector — an LLM subagent — reported, with no containment check. The rule applies to exactly one file, `.claude/state/develop-pipeline.last-halt.json`, yet any path is deleted; and a delta with no `path` makes `jq -r` print the literal `null`, so `rm -f null` runs in the repository root.

## Steps to Reproduce

`DETECTOR_JSON='{"deltas_since_pause":[{"concern":"stale-snapshot: PR merged"},{"path":"unrelated.txt","concern":"stale-snapshot: PR merged"}]}'` with `unrelated.txt` present → `set -x` shows `rm -f null` and `rm -f unrelated.txt`; `unrelated.txt` is gone.

## Expected Behavior

A reported path that is not the canonical snapshot path (canonicalised) is a HALT naming it; a `null`/non-string `path` is a HALT, never a filename.

## Actual Behavior

Both are deleted / attempted; exit 0. Reproduced by QA on 2026-09-20.

## Impact

Medium. The delete is bounded only by what a subagent chooses to write; a hallucinated or malformed path deletes a file outside `.claude/state`.

## Recommendation

Compare each path against the one canonical snapshot path (`canon` both sides, as Step 8 does) and HALT on any other value; select `.path | strings` (or HALT on non-string) so `null` never reaches `rm`. Test both.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 2)

**Root Cause Analysis**: the loop trusted the reported `path` string; jq rendered a missing key as the literal `null`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: the filter maps `.path` through `if type == "string" and length > 0 then . else error(…)` so a missing/non-string path fails the assignment (HALT); the loop compares each path to the canonical `.claude/state/develop-pipeline.last-halt.json` through `canon()` (dirname `pwd -P` + basename, both sides) and HALTs on any other value before `rm`.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — schema block binds `DETECTOR_JSON` and checks the array; delete block: exact label, string-path check, canonical-path containment, gated on validation
- `shared/resources/pipeline-resume-detector-prompt.md` — names `stale-snapshot: PR merged` as the only label the orchestrator acts on
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — cases H (both skip notes kept), I (foreign path → HALT, nothing deleted), J (no path → HALT, never `rm -f null`), K (schema block binds and rejects a non-array); 23/23 under bash and zsh
- bundled `skills/*/references/` regenerated

**Testing**: I (`unrelated.txt`) → HALT, file present; J (no path) → HALT with "without a string path". Mutations: containment dropped → I red; string check dropped → J red; restored → green.

**Verification Steps for QA**:
1. `{"deltas_since_pause":[{"concern":"stale-snapshot: PR merged"},{"path":"unrelated.txt","concern":"stale-snapshot: PR merged"}]}` → exit 1, no `rm` executed, `unrelated.txt` present.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

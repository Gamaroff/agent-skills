# Bug Report: Task 130 - a bare-string note in `deltas_since_pause` HALTs a healthy resume

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 safety re-probe CR-1, reproduced by QA)
**Date Found**: 2026-09-20

## Description

The detector prompt tells the subagent to put several *notes* in `deltas_since_pause` — "stale snapshot for `<other dir>` ignored", both `stale-snapshot check skipped — …` notes, and others — without giving them the object shape the field's table defines. A bare string passes the schema check (array of anything) but `.concern` on a string aborts jq, so the delete block HALTs a resume that is perfectly healthy — the exact "schema accepts / delete block refuses" split the block's own comment says it must not have.

## Steps to Reproduce

`DETECTOR_JSON='{"deltas_since_pause":["stale-snapshot check skipped — pr_url is not a GitHub PR"]}'` → `HALT: could not read stale-snapshot deltas … Cannot index string with string "concern"`.

## Expected Behavior

Every note is a delta object (`{path: <file or null>, concern: <text>}`); the schema check requires every element to be an object so a malformed one routes to the documented fallback; the delete selector skips non-objects.

## Actual Behavior

HALT on a healthy resume. Reproduced under bash on 2026-09-20.

## Impact

Medium. A Bitbucket consumer or an offline resume — the exact cases whose note is a string — cannot resume.

## Recommendation

Detector prompt: define the note shape once (`{ "path": …, "concern": "…" }`, `path` null when no file). Schema check: `all(.deltas_since_pause[]; type == "object")`. Delete selector: `select(type == "object")` before `.concern`. Tests: a string note → schema rejects (fallback), delete block skips.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 3)

**Root Cause Analysis**: the detector prompt placed notes in `deltas_since_pause` without giving them the object shape the field table defines; the schema check accepted an array of anything; the selector called `.concern` on every element.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: § Consume Output: the bind-and-validate block requires `(.deltas_since_pause | type == "array") and all(.deltas_since_pause[]; type == "object")` (a string note routes to the documented fallback); the delete selector opens with `select(type == "object")`. Detector prompt: every note is a delta object `{path, concern}`, stated once above Step 1 and at the two note sites.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — persist + bind-and-validate block; verify-then-delete loop (two passes; evidence re-read)
- `shared/resources/pipeline-resume-detector-prompt.md` — note shape stated once; tail block → pointer
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — rewritten harness (stub `gh`, snapshot with evidence, `{doc-directory}` binding); +K cases, +L/M/N/O; 31/31 under bash and zsh
- `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`) — provenance-first candidate ranking (CR-6); `develop-pipeline-step-8-commit.md` (+ glob-safe F2) — kept-legacy case named (CR-7)
- bundled `skills/*/references/` regenerated

**Testing**: stale-snapshot-delete.test.mjs K (string-note → schema exit 1; object-note → 0), L (string note reaching the delete block → skipped, exit 0). Mutations: `all(type=="object")` dropped → K red; `select(type=="object")` dropped → L red.

**Verification Steps for QA**: re-run the bug's reproduction against the committed tree; the listed test cases are the executed form.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 3 (safety re-probe) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

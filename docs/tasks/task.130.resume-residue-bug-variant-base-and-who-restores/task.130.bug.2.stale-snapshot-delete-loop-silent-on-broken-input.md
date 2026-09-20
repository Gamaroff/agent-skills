# Bug Report: Task 130 - the stale-snapshot delete loop exits 0 on an unset or malformed `$DETECTOR_JSON`

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (Step 3b diff code review CR-2, reproduced by QA)
**Date Found**: 2026-09-20

## Description

The one statement of the stale-snapshot delete (`shared/resources/develop-pipeline-resume-contract.md` § Consume Output) reads its paths from `printf '%s' "$DETECTOR_JSON" | jq -r '…'` inside a process substitution. When `DETECTOR_JSON` is unset or empty, jq is given empty input, emits nothing and exits 0; when a delta lacks `concern`, `startswith()` aborts jq with exit 5 — and in both cases the exit status is lost behind the substitution, the `while` body never runs, and the block exits 0 with the snapshot still on disk. "No stale snapshot" and "the reader is broken" resolve to the same silent success, which is the failure class this section was written to remove one layer down (a self-reported delete that may not have happened).

## Steps to Reproduce

Extract the block (`extractBlocks` on the contract, the fence carrying "Every `stale-snapshot` delta names a snapshot") and run it in a temp dir holding `.claude/state/develop-pipeline.last-halt.json`:

```bash
unset DETECTOR_JSON; <block>; echo "exit=$?"                       # exit=0, snapshot still present
DETECTOR_JSON='{"deltas_since_pause":[{"path":".claude/state/develop-pipeline.last-halt.json"}]}'; <block>; echo "exit=$?"
# jq: error … startswith() requires string inputs — exit=0, snapshot still present
```

## Expected Behavior

An unbound `$DETECTOR_JSON`, a `deltas_since_pause` that is not an array, or a jq failure is a HALT naming the cause; only a well-formed result with zero `stale-snapshot` deltas proceeds silently.

## Actual Behavior

Exit 0 in both cases; the snapshot survives; nothing is printed on the unset case. Reproduced by QA on 2026-09-20.

## Impact

Medium. The orchestrator prose binds `DETECTOR_JSON` immediately above the block, so the pipeline path works when followed; but the block is the one statement every orchestrator cites, and a resume that loses the binding (a re-run of the block in a fresh shell, the pattern the repository's own step docs warn about) would leave a merged run's snapshot in place and offer it as a resume next time — silently.

## Recommendation

Guard the input (`: "${DETECTOR_JSON:?…}"`), extend the schema check to `(.deltas_since_pause | type == "array")`, materialise the path list with jq's exit checked (`STALE=$(printf '%s' "$DETECTOR_JSON" | jq -r '…') || { echo "HALT: …"; exit 1; }`) using `(.concern // "")` so a missing key is a non-match rather than an abort, then loop over `$STALE`. Add `stale-snapshot-delete.test.mjs` cases for the unset variable and the missing-`concern` delta (both must exit 1).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 1)

**Root Cause Analysis**: the loop consumed `jq` through a process substitution, which discards jq's exit status; empty input produced no lines and exit 0, and `startswith` on a null `concern` aborted jq with no visible consequence. Nothing distinguished "zero stale deltas" from "could not read the deltas".

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: (1) `: "${DETECTOR_JSON:?HALT: …}"` guards the binding (no apostrophe in the message — bash parses the `:?` word for quotes even inside double quotes); (2) the path list is materialised into `STALE_PATHS` with jq's exit checked (`|| { echo "HALT: could not read stale-snapshot deltas …"; exit 1; }`), the filter `error()`s on a non-array `deltas_since_pause`, and `(.concern // "")` makes a missing key a non-match; (3) `jq -r`, not `-e` — `-e` exits 4 on an empty result and no stale snapshot is the ordinary case; (4) the `while` reads from a here-string so `exit 1` still ends the block under bash.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — the one statement of the delete
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — cases E (unbound → HALT), F (missing `concern` → non-match, kept, exit 0), G (non-array / unparsable → HALT exit 1); `run()` takes `rawJson` / `unsetVar`
- `CHANGELOG.md` and the task's Notes — the "process substitution" sentence corrected
- bundled `skills/*/references/develop-pipeline-resume-contract.md` regenerated

**Testing**: `stale-snapshot-delete.test.mjs` 13/13 (bash + zsh). Mutations: `:?` guard dropped → E red; `// ""` dropped → F red; `|| HALT` dropped → G red; each restored → green.

**Verification Steps for QA**:
1. Re-run both reproductions from the bug: unset → exit 1 with `DETECTOR_JSON is unbound`; missing `concern` → exit 0, snapshot kept, no jq error.
2. `{"deltas_since_pause":"nope"}` → exit 1 `HALT: could not read stale-snapshot deltas`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 1 (CR-2, reproduced) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 2 (reproduction re-run under bash and zsh; mutation covered) |

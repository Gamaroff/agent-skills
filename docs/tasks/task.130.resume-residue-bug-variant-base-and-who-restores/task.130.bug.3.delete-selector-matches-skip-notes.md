# Bug Report: Task 130 - the stale-snapshot delete selector matches the detector's skip notes and deletes a LIVE snapshot

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 2 refute pass CR-1, reproduced by QA)
**Date Found**: 2026-09-20

## Description

The one statement of the delete (`develop-pipeline-resume-contract.md` § Consume Output) selects deltas with `(.concern // "") | startswith("stale-snapshot")`. The detector prompt (Step 1 item 2) places **two skip notes** in `deltas_since_pause` for a snapshot that is explicitly *not* proven merged — `"stale-snapshot check skipped — pr_url is not a GitHub PR"` and `"stale-snapshot check skipped — gh pr view failed: …"` — and states that "a failed read is never evidence of MERGED … the snapshot stays an ordinary candidate". Both notes start with `stale-snapshot`, so the orchestrator `rm -f`s the live snapshot precisely when the read failed (offline, unauthenticated, Bitbucket). Every Bitbucket consumer and every offline resume hits this.

## Steps to Reproduce

Extract the Consume Output block; in a temp dir with `.claude/state/develop-pipeline.last-halt.json` present run it with
`DETECTOR_JSON='{"deltas_since_pause":[{"path":".claude/state/develop-pipeline.last-halt.json","concern":"stale-snapshot check skipped — gh pr view failed: offline"}]}'`.

## Expected Behavior

The snapshot is kept — the note is a skip, not a verdict.

## Actual Behavior

exit 0, snapshot deleted. Reproduced by QA under bash on 2026-09-20.

## Impact

HIGH. A resumable halt snapshot is destroyed on the failure path; the next invocation offers a fresh start for work that had a live pause. The cycle-1 test B case for "another concern" used `"modified after pause"` and could not see it — the earlier draft of that test *had* the skip-note case and dropped it.

## Recommendation

Select on the exact documented verdict label — `.concern == "stale-snapshot: PR merged"` — never a prefix; state in the detector prompt that this label is the only one the orchestrator acts on; add test cases whose concern is each skip wording, asserting the snapshot is kept.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 2)

**Root Cause Analysis**: the selector matched `stale-snapshot` as a prefix; the detector prompt defines two skip notes with the same prefix for a snapshot it has explicitly *not* proven merged.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: `select((.concern // "") == "stale-snapshot: PR merged")` — equality on the one verdict label the detector prompt defines for a proven merge; the prompt now states that this exact string is the only label acted on, and the contract records that the skip notes share the prefix by design and are never acted on.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — schema block binds `DETECTOR_JSON` and checks the array; delete block: exact label, string-path check, canonical-path containment, gated on validation
- `shared/resources/pipeline-resume-detector-prompt.md` — names `stale-snapshot: PR merged` as the only label the orchestrator acts on
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — cases H (both skip notes kept), I (foreign path → HALT, nothing deleted), J (no path → HALT, never `rm -f null`), K (schema block binds and rejects a non-array); 23/23 under bash and zsh
- bundled `skills/*/references/` regenerated

**Testing**: H (each skip wording) → snapshot kept, exit 0. Mutation: prefix selector restored → H red (4 cases, both shells); restored → green.

**Verification Steps for QA**:
1. Run the block with `concern: "stale-snapshot check skipped — gh pr view failed: offline"` → exit 0, snapshot present.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 2 (refute pass) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 3 (boundary re-probe; mutation covered) |

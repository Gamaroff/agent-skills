# Bug Report: Task 130 - the delete acts on the detector's label alone without re-reading the evidence from disk

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 3 safety re-probe CR-3; promoted by QA — the class is the one this task removes)
**Date Found**: 2026-09-20

## Description

The `rm` is gated on the exact label, the string path and the canonical-path containment — all properties of what the **subagent reported**. The block never re-reads the file it is about to delete to confirm the two facts the rule rests on: that the snapshot is for this document (`task_or_story_directory` canonicalised equals `{doc-directory}`) and that its `pr_url` is MERGED. A subagent that mislabels a live halt — wrong URL checked, hallucinated state, another document's snapshot it should have dropped — has the orchestrator destroy the only resume record on its say-so, which is the same trust task.130 removed from the detector's own `rm`.

## Expected Behavior

Before the `rm`, the block re-reads the evidence from disk: directory match (canon-equal) and `gh pr view "$(jq -r .pr_url "$p")" --json state --jq .state` == `MERGED`. A directory mismatch is a HALT naming it; a failed or non-MERGED read **keeps the snapshot and continues** — "a failed read is never evidence of MERGED" applies here as much as in the detector.

## Actual Behavior

Deleted on the label.

## Impact

Medium. The safeguard is exactly one subagent's honesty deep.

## Recommendation

Add the two on-disk checks to the block (local jq read; one `gh pr view` per delta), fail closed on mismatch, keep-and-note on an unreadable PR state; tests with a stub `gh` for MERGED / OPEN / failing, and a snapshot for another directory.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 3)

**Root Cause Analysis**: the delete was gated on the label, string path and containment — all properties of the subagent report; nothing re-read the snapshot.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: Pass 2 of the delete loop re-reads the snapshot: `task_or_story_directory` must canon-equal `{doc-directory}` (HALT naming the mismatch — the detector mislabelled it) and `gh pr view <pr_url> --json state` must read MERGED now (OPEN or a failed read → snapshot KEPT with the reason printed; a failed read is never evidence of a merge). Pass 1 validates every path first so the containment HALT's "nothing deleted" is true (CR-5).

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — persist + bind-and-validate block; verify-then-delete loop (two passes; evidence re-read)
- `shared/resources/pipeline-resume-detector-prompt.md` — note shape stated once; tail block → pointer
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — rewritten harness (stub `gh`, snapshot with evidence, `{doc-directory}` binding); +K cases, +L/M/N/O; 31/31 under bash and zsh
- `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`) — provenance-first candidate ranking (CR-6); `develop-pipeline-step-8-commit.md` (+ glob-safe F2) — kept-legacy case named (CR-7)
- bundled `skills/*/references/` regenerated

**Testing**: M (other document → HALT, kept), N (OPEN / gh fail → KEPT, exit 0), O (canonical then foreign → HALT with the canonical file still present); A now asserts the "removed (PR … is MERGED; directory matches)" line. Mutations: directory read dropped → M red; gh read dropped → N red; two passes collapsed → O red (+A/M/N).

**Verification Steps for QA**: re-run the bug's reproduction against the committed tree; the listed test cases are the executed form.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 3 (safety re-probe) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 4 (reproductions re-run under bash and zsh -f; mutation covered) |

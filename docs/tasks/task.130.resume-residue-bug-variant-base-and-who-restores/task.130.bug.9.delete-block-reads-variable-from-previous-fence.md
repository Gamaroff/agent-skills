# Bug Report: Task 130 - the delete block reads `$DETECTOR_JSON` from the previous fence; every orchestrator Bash call is a fresh shell

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-9
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 4 scoped review CR-1, reproduced by QA)
**Date Found**: 2026-09-20

## Description

Cycle 3 made the persisted file `.summaries/step-0a-resume-detector.json` the cross-fence carrier ("every later block in this section reads that file") — and then left the delete block reading the shell variable `$DETECTOR_JSON` that only the *previous* fence assigns. This repository's stated rule (`develop-pipeline-step-5-6-qa-loop.md`, `tracker-comment-contract.md`: every orchestrator Bash call is a fresh shell; a value derived in one block does not exist in the next) means the `:?` guard fires on every real run: the block HALTs instead of deleting — the cycle-2 bug-5 shape moved one fence up. `stale-snapshot-delete.test.mjs` could not see it because `run()` injects `DETECTOR_JSON=…` into the same script as the block.

## Steps to Reproduce

Persist a valid detector JSON to `{doc-directory}/.summaries/step-0a-resume-detector.json`, then run the delete block alone in a fresh shell → `DETECTOR_JSON: HALT: DETECTOR_JSON is unbound — run the bind-and-validate block first`. Reproduced by QA under bash on 2026-09-20.

## Expected Behavior

The delete block re-binds from the persisted artifact — `DETECTOR_JSON=$(cat {doc-directory}/.summaries/step-0a-resume-detector.json)` — HALTing only when the file is absent (the bind block did not run).

## Actual Behavior

HALT on every literal run.

## Impact

HIGH by the rule's own terms: the one statement of the delete never executes on a real resume, so a merged run's snapshot survives and is offered as a resume next time (obs #88, the defect Phase 3 exists to close) — and the failure is loud enough to stop every resume at Phase 0a. No data loss.

## Recommendation

Re-bind from the file in the delete block; keep the file as the carrier; change test E to assert the HALT when the `.summaries` file is absent, and add a case that runs the bind block and the delete block in two separate shells.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 4)

**Root Cause Analysis**: the cycle-3 fix made the persisted file the carrier but left the delete block reading `$DETECTOR_JSON` — a variable only the previous fence sets; the harness injected the variable into the same script, so it could not see it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: The delete block binds `DETECTOR_FILE={doc-directory}/.summaries/step-0a-resume-detector.json`, HALTs (nothing deleted) when that file is absent or empty — which means the bind block never ran — and re-reads `DETECTOR_JSON` from it. Rule 6 in the block header states why. The test suite no longer injects a variable anywhere: the file is the only carrier in every case.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — delete block re-binds from `{doc-directory}/.summaries/step-0a-resume-detector.json` (rule 6: the file is the carrier); empty `pr_url` → KEPT before any `gh` call; prose names the fresh-shell rule
- `shared/resources/pipeline-resume-detector-prompt.md` — § Output Schema field table is the one statement of the note-object shape; sites :108, :112, :113, :167 and the mtime delta rewritten as objects; CR-5 mtime fields conditional
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — file-only carrier (no variable injection); E asserts the HALT on an absent file; P runs bind and delete in two separate processes; N2 no-`pr_url` + MERGED stub → KEPT; Q enumerates the prompt's `deltas_since_pause` sites (same-line object or continuation of an object opened above — a ±1 window let neighbours vouch for each other); 36/36 under bash and `zsh -f`
- `shared/resources/advance-pipeline-lock.test.sh` — CR-4: provenance scenario comment corrected, consume asserted (85/85)
- bundled `skills/*/references/` regenerated

**Testing**: E (absent file → HALT, exit 1, nothing deleted), P (bind block in one process, delete block in a second, MERGED stub → removed) under bash and `zsh -f`. Mutation: the re-bind replaced with the old `:?` variable guard → 32 red including E and P (every case now runs the block in a fresh process).

**Verification Steps for QA**: re-run the bug's reproduction against the committed tree; the listed test cases are the executed form.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 4 (cycle 4 scoped review CR-1, reproduced by QA) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |

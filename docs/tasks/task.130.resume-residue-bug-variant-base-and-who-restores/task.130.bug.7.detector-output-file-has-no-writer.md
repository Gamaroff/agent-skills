# Bug Report: Task 130 - `<detector-output-file>` has no writer — the detector is read-only and *returns* JSON

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 3 safety re-probe CR-2)
**Date Found**: 2026-09-20

## Description

The cycle-2 fix bound `DETECTOR_JSON=$(cat <detector-output-file>)`, described as "the file the Explore dispatch wrote its JSON to". The detector prompt forbids the subagent every write ("Read-only — no writes") and says it **returns** JSON; no orchestrator step says to save the returned text anywhere. On a literal run the file does not exist, `cat` fails, the variable is empty, `jq -e` exits 4, every resume logs "Detector output invalid" and the delete block is skipped by rule — the cycle-2 unbound-variable defect moved one level down to an unbound file. The angle-bracket placeholder is also a bash syntax error if left in, where the repository's convention is `{placeholder}`.

## Expected Behavior

The orchestrator persists the returned JSON to a named path before this block — the pipeline already has the convention: `{doc-directory}/.summaries/step-0a-resume-detector.json` (per `subagent-summary-artifact.md`; the replay fixtures use `.eval/detector-output.json`) — and the block binds from that path, spelled `{…}`.

## Actual Behavior

No fence or sentence writes the file the block reads.

## Impact

Medium. The delete block never runs on a literal resume; a merged run's snapshot survives and is offered again — the obs #88 defect the phase exists to close.

## Recommendation

State the write in § Consume Output: `printf '%s' '<the returned JSON>' > {doc-directory}/.summaries/step-0a-resume-detector.json` (or the Explore dispatch's persisted summary path), then `DETECTOR_JSON=$(cat {doc-directory}/.summaries/step-0a-resume-detector.json)`; keep the detector read-only.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 3)

**Root Cause Analysis**: the cycle-2 fix bound from a file the read-only detector never writes; no fence or sentence persisted the returned JSON.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: § Consume Output states the write: the orchestrator persists the returned JSON verbatim to `{doc-directory}/.summaries/step-0a-resume-detector.json` (quoted heredoc, the subagent-summary convention) and binds `DETECTOR_JSON` from that path — `{placeholder}` spelling, no angle brackets. The detector prompt § "orchestrator validates" tail is a pointer to the contract (CR-4).

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — persist + bind-and-validate block; verify-then-delete loop (two passes; evidence re-read)
- `shared/resources/pipeline-resume-detector-prompt.md` — note shape stated once; tail block → pointer
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — rewritten harness (stub `gh`, snapshot with evidence, `{doc-directory}` binding); +K cases, +L/M/N/O; 31/31 under bash and zsh
- `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`) — provenance-first candidate ranking (CR-6); `develop-pipeline-step-8-commit.md` (+ glob-safe F2) — kept-legacy case named (CR-7)
- bundled `skills/*/references/` regenerated

**Testing**: K asserts the block persisted `.summaries/step-0a-resume-detector.json` and bound a non-empty `DETECTOR_JSON` (bash+zsh).

**Verification Steps for QA**: re-run the bug's reproduction against the committed tree; the listed test cases are the executed form.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 3 (safety re-probe) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 4 (reproductions re-run under bash and zsh -f; mutation covered) |
